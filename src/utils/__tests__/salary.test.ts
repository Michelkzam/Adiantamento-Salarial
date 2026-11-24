import { describe, it, expect } from 'vitest';
import { getTotalSalary, getRemainingBalance, getMaxAdvance, getUsagePercentage } from '../salary';
import { Employee } from '../../types';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'test-id',
    name: 'João da Silva',
    position: 'Analista',
    department: 'Financeiro',
    salary: 3000,
    foodAllowance: 500,
    transportAllowance: 200,
    overtime: 300,
    services: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('salary utils', () => {
  describe('getTotalSalary', () => {
    it('should calculate total salary with all allowances', () => {
      const employee = makeEmployee();
      expect(getTotalSalary(employee)).toBe(4100);
    });

    it('should handle zero allowances', () => {
      const employee = makeEmployee({
        foodAllowance: 0,
        transportAllowance: 0,
        overtime: 0,
        services: 0,
      });
      expect(getTotalSalary(employee)).toBe(3000);
    });

    it('should handle undefined allowances as zero', () => {
      const employee = makeEmployee({
        foodAllowance: undefined as unknown as number,
        transportAllowance: undefined as unknown as number,
        overtime: undefined as unknown as number,
        services: undefined as unknown as number,
      });
      expect(getTotalSalary(employee)).toBe(3000);
    });
  });

  describe('getRemainingBalance', () => {
    it('should calculate remaining balance correctly', () => {
      const employee = makeEmployee();
      const advances = [{ employeeId: 'test-id', amount: 1000 }];
      expect(getRemainingBalance(employee, advances)).toBe(3100);
    });

    it('should return total salary when no advances', () => {
      const employee = makeEmployee();
      expect(getRemainingBalance(employee, [])).toBe(4100);
    });

    it('should handle negative balance', () => {
      const employee = makeEmployee();
      const advances = [{ employeeId: 'test-id', amount: 5000 }];
      expect(getRemainingBalance(employee, advances)).toBe(-900);
    });

    it('should only count advances for the specific employee', () => {
      const employee = makeEmployee();
      const advances = [
        { employeeId: 'other-id', amount: 3000 },
        { employeeId: 'test-id', amount: 500 },
      ];
      expect(getRemainingBalance(employee, advances)).toBe(3600);
    });
  });

  describe('getMaxAdvance', () => {
    it('should return 60% of total salary when balance is sufficient', () => {
      const employee = makeEmployee();
      expect(getMaxAdvance(employee, [])).toBe(2460);
    });

    it('should return remaining balance when it is less than 60%', () => {
      const employee = makeEmployee();
      const advances = [{ employeeId: 'test-id', amount: 3000 }];
      expect(getMaxAdvance(employee, advances)).toBe(1100);
    });

    it('should return 0 when balance is exhausted', () => {
      const employee = makeEmployee();
      const advances = [{ employeeId: 'test-id', amount: 4100 }];
      expect(getMaxAdvance(employee, advances)).toBe(0);
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate usage percentage correctly', () => {
      const employee = makeEmployee();
      const advances = [{ employeeId: 'test-id', amount: 2050 }];
      expect(getUsagePercentage(employee, advances)).toBe(50);
    });

    it('should return 0 when no advances', () => {
      const employee = makeEmployee();
      expect(getUsagePercentage(employee, [])).toBe(0);
    });

    it('should return 0 when salary is 0', () => {
      const employee = makeEmployee({ salary: 0, foodAllowance: 0, transportAllowance: 0, overtime: 0, services: 0 });
      expect(getUsagePercentage(employee, [{ employeeId: 'test-id', amount: 100 }])).toBe(0);
    });
  });
});
