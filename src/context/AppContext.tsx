import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type {
  Employee, AdvanceRecord, EmployeeInput, AdvanceInput, FixedDeduction, FixedDeductionInput,
  PayrollPeriod, AuditEntry,
} from '../types';
import { AppDatabase, openDatabase } from '../db/database';
import * as repo from '../db/repository';
import { periodOf } from '../utils/period';

interface AppState {
  employees: Employee[];
  advances: AdvanceRecord[];
  fixedDeductions: FixedDeduction[];
  periods: PayrollPeriod[];
  isLoading: boolean;
  loadError: string | null;
}

interface AppContextValue extends AppState {
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  isPeriodClosed: (period: string) => boolean;
  /** Retorna as competências abertas em que o total lançado passou da remuneração. */
  addEmployee: (data: EmployeeInput, fixed?: FixedDeductionInput[]) => Promise<string[]>;
  updateEmployee: (id: string, data: EmployeeInput, fixed?: FixedDeductionInput[]) => Promise<string[]>;
  deleteEmployee: (id: string) => Promise<void>;
  addAdvance: (employeeId: string, data: AdvanceInput) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  markAdvanceDeducted: (id: string) => Promise<void>;
  closePeriod: (period: string) => Promise<number>;
  reopenPeriod: (period: string) => Promise<void>;
  importData: (employees: Employee[], advances: AdvanceRecord[]) => Promise<void>;
  exportData: () => Promise<{ employees: Employee[]; advances: AdvanceRecord[] }>;
  backupDatabase: () => Promise<string | null>;
  restoreDatabase: () => Promise<boolean>;
  getAuditLog: (limit?: number) => AuditEntry[];
  getEmployeeById: (id: string) => Employee | undefined;
  getEmployeeAdvances: (employeeId: string) => AdvanceRecord[];
  getEmployeeFixedDeductions: (employeeId: string) => FixedDeduction[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    employees: [], advances: [], fixedDeductions: [], periods: [], isLoading: true, loadError: null,
  });
  const [selectedPeriod, setSelectedPeriodState] = useState(periodOf());
  const dbRef = useRef<AppDatabase | null>(null);

  const refresh = useCallback(() => {
    const db = dbRef.current?.db;
    if (!db) return;
    setState((prev) => ({
      ...prev,
      employees: repo.listEmployees(db),
      advances: repo.listAdvances(db),
      fixedDeductions: repo.listFixedDeductions(db),
      periods: repo.listPeriods(db),
    }));
  }, []);

  const write = useCallback(async <T,>(fn: Parameters<AppDatabase['write']>[0]): Promise<T> => {
    const app = dbRef.current;
    if (!app) throw new Error('Banco de dados ainda não carregado.');
    try {
      return (await app.write(fn)) as T;
    } finally {
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const app = await openDatabase();
        if (cancelled) return;
        dbRef.current = app;
        await app.write((db) => repo.ensurePeriod(db, periodOf()));
        refresh();
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (e) {
        console.error(e);
        setState((prev) => ({ ...prev, isLoading: false, loadError: e instanceof Error ? e.message : String(e) }));
      }
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  const setSelectedPeriod = useCallback((period: string) => {
    setSelectedPeriodState(period);
    if (dbRef.current) {
      write((db) => repo.ensurePeriod(db, period)).catch((e) => console.error(e));
    }
  }, [write]);

  const isPeriodClosed = useCallback(
    (period: string) => state.periods.some((p) => p.yearMonth === period && p.status === 'closed'),
    [state.periods],
  );

  const addEmployee = useCallback(async (data: EmployeeInput, fixed: FixedDeductionInput[] = []) => {
    return write<string[]>((db) => repo.overcommittedPeriods(db, repo.createEmployee(db, data, fixed).id));
  }, [write]);

  const updateEmployee = useCallback(async (id: string, data: EmployeeInput, fixed?: FixedDeductionInput[]) => {
    return write<string[]>((db) => {
      repo.updateEmployee(db, id, data, fixed);
      return repo.overcommittedPeriods(db, id);
    });
  }, [write]);

  const deleteEmployee = useCallback(async (id: string) => {
    await write((db) => repo.deleteEmployee(db, id));
  }, [write]);

  const addAdvance = useCallback(async (employeeId: string, data: AdvanceInput) => {
    await write((db) => repo.createAdvance(db, employeeId, data));
  }, [write]);

  const deleteAdvance = useCallback(async (id: string) => {
    await write((db) => repo.deleteAdvance(db, id));
  }, [write]);

  const markAdvanceDeducted = useCallback(async (id: string) => {
    await write((db) => repo.markAdvanceDeducted(db, id));
  }, [write]);

  const closePeriod = useCallback(
    (period: string) => write<number>((db) => repo.closePeriod(db, period)),
    [write],
  );

  const reopenPeriod = useCallback(async (period: string) => {
    await write((db) => repo.reopenPeriod(db, period));
  }, [write]);

  const importData = useCallback(async (employees: Employee[], advances: AdvanceRecord[]) => {
    await write((db) => repo.replaceWithImported(db, { employees, advances }));
  }, [write]);

  const exportData = useCallback(async () => ({ employees: state.employees, advances: state.advances }),
    [state.employees, state.advances]);

  const backupDatabase = useCallback(async () => {
    const app = dbRef.current;
    if (!app) return null;
    const bytes = app.exportBytes();
    if (window.electronAPI?.dbExport) {
      const res = await window.electronAPI.dbExport(bytes);
      if (!res.success && !res.canceled) throw new Error(res.error || 'Falha ao salvar backup');
      return res.success ? res.filePath ?? '' : null;
    }
    const name = `backup_adiantamentos_${new Date().toISOString().slice(0, 10)}.sqlite`;
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.sqlite3' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return name;
  }, []);

  const restoreDatabase = useCallback(async () => {
    const app = dbRef.current;
    if (!app) return false;
    let bytes: Uint8Array | null = null;
    if (window.electronAPI?.dbImport) {
      bytes = await window.electronAPI.dbImport();
    } else {
      bytes = await new Promise<Uint8Array | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.sqlite,.db';
        input.onchange = async () => {
          const file = input.files?.[0];
          resolve(file ? new Uint8Array(await file.arrayBuffer()) : null);
        };
        input.click();
      });
    }
    if (!bytes) return false;
    await app.replaceWith(bytes);
    await app.write((db) => {
      repo.audit(db, 'db.restore', 'database', null, 'Banco de dados restaurado a partir de backup');
      repo.ensurePeriod(db, periodOf());
    });
    refresh();
    return true;
  }, [refresh]);

  const getAuditLog = useCallback((limit = 500) => {
    const db = dbRef.current?.db;
    return db ? repo.listAudit(db, limit) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const getEmployeeById = useCallback(
    (id: string) => state.employees.find((emp) => emp.id === id),
    [state.employees],
  );

  const getEmployeeAdvances = useCallback(
    (employeeId: string) => state.advances.filter((adv) => adv.employeeId === employeeId),
    [state.advances],
  );

  const getEmployeeFixedDeductions = useCallback(
    (employeeId: string) => state.fixedDeductions.filter((d) => d.employeeId === employeeId),
    [state.fixedDeductions],
  );

  const value: AppContextValue = {
    ...state,
    selectedPeriod, setSelectedPeriod, isPeriodClosed,
    addEmployee, updateEmployee, deleteEmployee,
    addAdvance, deleteAdvance, markAdvanceDeducted,
    closePeriod, reopenPeriod,
    importData, exportData, backupDatabase, restoreDatabase, getAuditLog,
    getEmployeeById, getEmployeeAdvances, getEmployeeFixedDeductions,
  };

  if (state.loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
          <h1 className="text-lg font-semibold mb-2">Não foi possível abrir o banco de dados</h1>
          <p className="text-sm">{state.loadError}</p>
          <p className="text-sm mt-2">Nenhum dado foi apagado. Feche o aplicativo e entre em contato com o suporte.</p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
