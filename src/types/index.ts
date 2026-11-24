export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  foodAllowance: number;
  transportAllowance: number;
  overtime: number;
  services: number;
  isActive: boolean;
  createdAt: string;
}

export type AdvanceStatus = 'pending' | 'deducted';
export type AdvanceSource = 'manual' | 'fixed';

export interface AdvanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  time: string;
  notes?: string;
  status: AdvanceStatus;
  period: string;
  source: AdvanceSource;
  fixedDeductionId?: string | null;
}

export type FixedDeductionKind = 'pension' | 'other';
export type FixedDeductionMode = 'fixed' | 'percent';
export type FixedDeductionBase = 'salary' | 'total';

export interface FixedDeduction {
  id: string;
  employeeId: string;
  kind: FixedDeductionKind;
  description: string;
  mode: FixedDeductionMode;
  /** R$ quando mode = 'fixed'; percentual (ex.: 30 = 30%) quando mode = 'percent' */
  value: number;
  base: FixedDeductionBase;
  isActive: boolean;
  startPeriod: string;
  endPeriod?: string | null;
}

export type FixedDeductionInput = Omit<FixedDeduction, 'id' | 'employeeId'> & { id?: string };

export type PeriodStatus = 'open' | 'closed';

/** Remuneração do funcionário congelada no fechamento da competência. */
export interface SalarySnapshot {
  period: string;
  employeeId: string;
  salary: number;
  foodAllowance: number;
  transportAllowance: number;
  overtime: number;
  services: number;
}

export interface PayrollPeriod {
  yearMonth: string;
  status: PeriodStatus;
  closedAt?: string | null;
}

export interface AuditEntry {
  id: number;
  at: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  before: string | null;
  after: string | null;
}

export type EmployeeInput = Omit<Employee, 'id' | 'createdAt'>;
export type AdvanceInput = {
  amount: number;
  time: string;
  notes?: string;
  date?: string;
  period?: string;
};
