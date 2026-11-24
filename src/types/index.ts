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

export interface AdvanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: string;
  time: string;
  notes?: string;
  status: AdvanceStatus;
}

export type EmployeeInput = Omit<Employee, 'id' | 'createdAt'>;
export type AdvanceInput = Omit<AdvanceRecord, 'id' | 'date' | 'status' | 'employeeId' | 'employeeName'> & { date?: string };
