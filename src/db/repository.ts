import { Employee, AdvanceRecord, AdvanceStatus } from '../types';
import {
  initDatabase,
  loadEmployees,
  loadAdvances,
  saveEmployees,
  saveAdvances,
  replaceAll,
} from './database';

let initialized = false;

function ensureInit(): void {
  if (!initialized) {
    initDatabase();
    initialized = true;
  }
}

export async function getAllEmployees(): Promise<Employee[]> {
  ensureInit();
  return loadEmployees<Employee>();
}

export async function getAllAdvances(): Promise<AdvanceRecord[]> {
  ensureInit();
  return loadAdvances<AdvanceRecord>();
}

export async function insertEmployee(employee: Employee): Promise<void> {
  ensureInit();
  const employees = loadEmployees<Employee>();
  employees.push(employee);
  saveEmployees(employees);
}

export async function updateEmployee(id: string, data: Partial<Omit<Employee, 'id' | 'createdAt'>>): Promise<void> {
  ensureInit();
  const employees = loadEmployees<Employee>();
  const idx = employees.findIndex((e) => e.id === id);
  if (idx !== -1) {
    employees[idx] = { ...employees[idx], ...data };
    saveEmployees(employees);
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  ensureInit();
  const employees = loadEmployees<Employee>().filter((e) => e.id !== id);
  const advances = loadAdvances<AdvanceRecord>().filter((a) => a.employeeId !== id);
  replaceAll(employees, advances);
}

export async function insertAdvance(advance: AdvanceRecord): Promise<void> {
  ensureInit();
  const advances = loadAdvances<AdvanceRecord>();
  advances.push(advance);
  saveAdvances(advances);
}

export async function deleteAdvance(id: string): Promise<void> {
  ensureInit();
  const advances = loadAdvances<AdvanceRecord>().filter((a) => a.id !== id);
  saveAdvances(advances);
}

export async function updateAdvanceStatus(id: string, status: AdvanceStatus): Promise<void> {
  ensureInit();
  const advances = loadAdvances<AdvanceRecord>();
  const idx = advances.findIndex((a) => a.id === id);
  if (idx !== -1) {
    advances[idx] = { ...advances[idx], status };
    saveAdvances(advances);
  }
}

export async function importAllData(employees: Employee[], advances: AdvanceRecord[]): Promise<void> {
  ensureInit();
  replaceAll(employees, advances);
}

export async function replaceAllData(employees: Employee[], advances: AdvanceRecord[]): Promise<void> {
  ensureInit();
  replaceAll(employees, advances);
}

export async function exportAllData(): Promise<{ employees: Employee[]; advances: AdvanceRecord[] }> {
  ensureInit();
  return {
    employees: loadEmployees<Employee>(),
    advances: loadAdvances<AdvanceRecord>(),
  };
}
