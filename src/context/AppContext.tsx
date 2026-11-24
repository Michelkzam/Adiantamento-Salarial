import React, { createContext, useContext, useCallback, useEffect, useState, useRef } from 'react';
import { Employee, AdvanceRecord, EmployeeInput, AdvanceInput } from '../types';
import * as db from '../db/repository';

interface AppState {
  employees: Employee[];
  advances: AdvanceRecord[];
  isLoading: boolean;
}

interface AppContextValue extends AppState {
  addEmployee: (data: EmployeeInput) => Promise<void>;
  updateEmployee: (id: string, data: EmployeeInput) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addAdvance: (employeeId: string, data: AdvanceInput) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  markAdvanceDeducted: (id: string) => Promise<void>;
  importData: (employees: Employee[], advances: AdvanceRecord[]) => Promise<void>;
  exportData: () => Promise<{ employees: Employee[]; advances: AdvanceRecord[] }>;
  getEmployeeById: (id: string) => Employee | undefined;
  getEmployeeAdvances: (employeeId: string) => AdvanceRecord[];
}

const AppContext = createContext<AppContextValue | null>(null);

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const AUTO_BACKUP_KEY = 'adiantamento_auto_backup';
const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000;

function autoBackup(employees: Employee[], advances: AdvanceRecord[]) {
  try {
    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify({ employees, advances, timestamp: Date.now() }));
  } catch { /* silent */ }
}

function loadAutoBackup(): { employees: Employee[]; advances: AdvanceRecord[] } | null {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.employees && data.advances) return data;
  } catch { /* silent */ }
  return null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    employees: [],
    advances: [],
    isLoading: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const employees = await db.getAllEmployees();
        const advances = await db.getAllAdvances();

        const seen = new Set<string>();
        const dedupedAdvances = advances.filter((adv) => {
          const key = `${adv.employeeId}-${adv.amount}-${adv.time}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (dedupedAdvances.length < advances.length) {
          await db.replaceAllData(employees, dedupedAdvances);
        }

        const finalAdvances = dedupedAdvances.length < advances.length ? dedupedAdvances : advances;

        if (employees.length === 0 && finalAdvances.length === 0) {
          const backup = loadAutoBackup();
          if (backup) {
            setState({ employees: backup.employees, advances: backup.advances, isLoading: false });
            autoBackup(backup.employees, backup.advances);
            return;
          }
        }
        setState({ employees, advances: finalAdvances, isLoading: false });
        autoBackup(employees, finalAdvances);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        const backup = loadAutoBackup();
        if (backup) {
          setState({ employees: backup.employees, advances: backup.advances, isLoading: false });
        } else {
          setState({ employees: [], advances: [], isLoading: false });
        }
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      autoBackup(state.employees, state.advances);
    }
  }, [state.employees, state.advances, state.isLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.isLoading) {
        autoBackup(state.employees, state.advances);
      }
    }, AUTO_BACKUP_INTERVAL);
    return () => clearInterval(interval);
  }, [state.employees, state.advances, state.isLoading]);

  const addEmployee = useCallback(async (data: EmployeeInput) => {
    const newEmployee: Employee = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    await db.insertEmployee(newEmployee);
    setState((prev) => ({ ...prev, employees: [...prev.employees, newEmployee] }));
  }, []);

  const updateEmployee = useCallback(async (id: string, data: EmployeeInput) => {
    await db.updateEmployee(id, data);
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((emp) => (emp.id === id ? { ...emp, ...data } : emp)),
    }));
  }, []);

  const deleteEmployee = useCallback(async (id: string) => {
    await db.deleteEmployee(id);
    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((emp) => emp.id !== id),
      advances: prev.advances.filter((adv) => adv.employeeId !== id),
    }));
  }, []);

  const advanceIdempotencyRef = useRef<Set<string>>(new Set());

  const addAdvance = useCallback(async (employeeId: string, data: AdvanceInput) => {
    const key = `${employeeId}-${data.amount}`;
    if (advanceIdempotencyRef.current.has(key)) return;
    advanceIdempotencyRef.current.add(key);

    try {
      const currentEmployees = await db.getAllEmployees();
      const employee = currentEmployees.find((emp) => emp.id === employeeId);
      if (!employee) {
        advanceIdempotencyRef.current.delete(key);
        return;
      }

      const advanceDate = data.date || new Date().toISOString();
      const currentAdvances = await db.getAllAdvances();
      const duplicateExists = currentAdvances.some(
        (a) =>
          a.employeeId === employeeId &&
          a.amount === data.amount &&
          a.time === data.time &&
          a.date.slice(0, 10) === advanceDate.slice(0, 10)
      );
      if (duplicateExists) {
        advanceIdempotencyRef.current.delete(key);
        return;
      }

      const newAdvance: AdvanceRecord = {
        ...data,
        id: generateId(),
        employeeId,
        employeeName: employee.name,
        date: advanceDate,
        status: 'pending',
      };
      await db.insertAdvance(newAdvance);
      setState((prev) => ({ ...prev, advances: [...prev.advances, newAdvance] }));
    } finally {
      setTimeout(() => advanceIdempotencyRef.current.delete(key), 3000);
    }
  }, []);

  const deleteAdvance = useCallback(async (id: string) => {
    await db.deleteAdvance(id);
    setState((prev) => ({
      ...prev,
      advances: prev.advances.filter((adv) => adv.id !== id),
    }));
  }, []);

  const markAdvanceDeducted = useCallback(async (id: string) => {
    await db.updateAdvanceStatus(id, 'deducted');
    setState((prev) => ({
      ...prev,
      advances: prev.advances.map((adv) =>
        adv.id === id ? { ...adv, status: 'deducted' as const } : adv
      ),
    }));
  }, []);

  const importData = useCallback(async (employees: Employee[], advances: AdvanceRecord[]) => {
    await db.importAllData(employees, advances);
    setState({ employees, advances, isLoading: false });
  }, []);

  const exportData = useCallback(async () => {
    return db.exportAllData();
  }, []);

  const getEmployeeById = useCallback(
    (id: string) => state.employees.find((emp) => emp.id === id),
    [state.employees]
  );

  const getEmployeeAdvances = useCallback(
    (employeeId: string) =>
      state.advances
        .filter((adv) => adv.employeeId === employeeId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.advances]
  );

  const value: AppContextValue = {
    ...state,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addAdvance,
    deleteAdvance,
    markAdvanceDeducted,
    importData,
    exportData,
    getEmployeeById,
    getEmployeeAdvances,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
