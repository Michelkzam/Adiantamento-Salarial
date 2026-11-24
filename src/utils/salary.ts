import { Employee } from '../types';

const MAX_PERCENTAGE = 0.6;

const ALLOWANCE_FIELDS = [
  'foodAllowance',
  'transportAllowance',
  'overtime',
  'services',
] as const;

export function getTotalSalary(employee: Employee): number {
  return (
    employee.salary +
    ALLOWANCE_FIELDS.reduce((sum, field) => sum + (employee[field] || 0), 0)
  );
}

export function getEmployeeAdvances(
  advances: { employeeId: string; amount: number; status?: string }[],
  employeeId: string
): number {
  return advances
    .filter((a) => a.employeeId === employeeId && a.status !== 'deducted')
    .reduce((sum, a) => sum + a.amount, 0);
}

export function getRemainingBalance(
  employee: Employee,
  advances: { employeeId: string; amount: number; status?: string }[]
): number {
  return getTotalSalary(employee) - getEmployeeAdvances(advances, employee.id);
}

export function getMaxAdvance(
  employee: Employee,
  advances: { employeeId: string; amount: number; status?: string }[]
): number {
  const totalSalary = getTotalSalary(employee);
  const remaining = getRemainingBalance(employee, advances);
  return Math.min(totalSalary * MAX_PERCENTAGE, remaining);
}

export function getUsagePercentage(
  employee: Employee,
  advances: { employeeId: string; amount: number; status?: string }[]
): number {
  const total = getTotalSalary(employee);
  if (total === 0) return 0;
  return (getEmployeeAdvances(advances, employee.id) / total) * 100;
}
