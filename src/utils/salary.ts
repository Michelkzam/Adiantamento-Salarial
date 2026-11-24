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

/** Soma todos os lançamentos (avulsos e fixos, pendentes ou descontados) do funcionário na lista informada. */
export function sumEmployeeAdvances(
  advances: { employeeId: string; amount: number }[],
  employeeId: string
): number {
  return Math.round(
    advances.filter((a) => a.employeeId === employeeId).reduce((sum, a) => sum + a.amount * 100, 0)
  ) / 100;
}

/** Resumo da competência: limite de 60% acumulado para avulsos; fixos (pensão) fora dos 60%, mas dentro da remuneração. */
export function getPeriodSummary(
  employee: Employee,
  periodAdvances: { employeeId: string; amount: number; source?: string }[]
) {
  const own = periodAdvances.filter((a) => a.employeeId === employee.id);
  const cents = (list: { amount: number }[]) => list.reduce((s, a) => s + Math.round(a.amount * 100), 0);
  const totalCents = Math.round(getTotalSalary(employee) * 100);
  const fixedCents = cents(own.filter((a) => a.source === 'fixed'));
  const manualCents = cents(own.filter((a) => a.source !== 'fixed'));
  const remainingCents = totalCents - fixedCents - manualCents;
  const maxManualCents = Math.max(0, Math.min(Math.round(totalCents * MAX_PERCENTAGE) - manualCents, remainingCents));
  return {
    total: totalCents / 100,
    fixed: fixedCents / 100,
    manual: manualCents / 100,
    used: (fixedCents + manualCents) / 100,
    remaining: remainingCents / 100,
    maxAdvance: maxManualCents / 100,
    manualLimit: Math.round(totalCents * MAX_PERCENTAGE) / 100,
  };
}
