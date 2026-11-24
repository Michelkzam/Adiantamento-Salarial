import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database, SqlJsStatic } from 'sql.js';
import * as repo from '../repository';
import { migrateLegacyData } from '../database';
import type { EmployeeInput, FixedDeductionInput } from '../../types';

let SQL: SqlJsStatic;
let db: Database;

const base: EmployeeInput = {
  name: 'Maria', position: 'Caixa', department: 'Loja',
  salary: 2000, foodAllowance: 500, transportAllowance: 0, overtime: 0, services: 0, isActive: true,
};

const pension = (over: Partial<FixedDeductionInput> = {}): FixedDeductionInput => ({
  kind: 'pension', description: 'Pensão alimentícia', mode: 'percent', value: 30, base: 'salary',
  isActive: true, startPeriod: '2026-01', endPeriod: null, ...over,
});

beforeAll(async () => {
  SQL = await initSqlJs();
});

beforeEach(() => {
  db = new SQL.Database();
  repo.migrate(db);
});

describe('schema', () => {
  it('aplica migrações e é idempotente', () => {
    repo.migrate(db);
    const v = db.exec('PRAGMA user_version')[0].values[0][0];
    expect(v).toBe(1);
  });
});

describe('limite mensal de 60%', () => {
  it('acumula os adiantamentos avulsos da competência', () => {
    const e = repo.createEmployee(db, { ...base, foodAllowance: 0, salary: 1000 });
    repo.createAdvance(db, e.id, { amount: 400, time: '10:00', period: '2026-03' });
    expect(() => repo.createAdvance(db, e.id, { amount: 250, time: '11:00', period: '2026-03' }))
      .toThrow(repo.BusinessError);
    repo.createAdvance(db, e.id, { amount: 200, time: '11:00', period: '2026-03' });
    expect(repo.periodUsage(db, e, '2026-03').maxManualCents).toBe(0);
    expect(repo.periodUsage(db, e, '2026-04').maxManualCents).toBe(60000);
  });
});

describe('adiantamentos fixos (pensão)', () => {
  it('percentual sobre salário base gera lançamento fixo em cada competência aberta', () => {
    const e = repo.createEmployee(db, base, [pension()]);
    repo.ensurePeriod(db, '2026-05');
    const fixed = repo.listAdvances(db).filter((a) => a.source === 'fixed' && a.period === '2026-05');
    expect(fixed).toHaveLength(1);
    expect(fixed[0].amount).toBe(600);
    repo.ensurePeriod(db, '2026-05');
    expect(repo.listAdvances(db).filter((a) => a.period === '2026-05')).toHaveLength(1);
    const usage = repo.periodUsage(db, e, '2026-05');
    expect(usage.fixedCents).toBe(60000);
    expect(usage.maxManualCents).toBe(150000);
  });

  it('percentual sobre remuneração total e valor fixo', () => {
    const e = repo.createEmployee(db, base);
    expect(repo.fixedAmountCents(e, { mode: 'percent', value: 20, base: 'total' })).toBe(50000);
    expect(repo.fixedAmountCents(e, { mode: 'fixed', value: 350.55, base: 'salary' })).toBe(35055);
  });

  it('pensão fica fora dos 60%, mas o total nunca passa da remuneração', () => {
    const e = repo.createEmployee(db, { ...base, foodAllowance: 0, salary: 1000 }, [pension({ mode: 'fixed', value: 700 })]);
    repo.ensurePeriod(db, '2026-02');
    expect(repo.periodUsage(db, e, '2026-02').maxManualCents).toBe(30000);
  });

  it('respeita início/fim, recalcula ao mudar salário e remove ao desabilitar', () => {
    const e = repo.createEmployee(db, base, [pension({ startPeriod: '2026-03', endPeriod: '2026-04' })]);
    ['2026-02', '2026-03', '2026-04', '2026-05'].forEach((p) => repo.ensurePeriod(db, p));
    expect(repo.listAdvances(db).map((a) => a.period).sort()).toEqual(['2026-03', '2026-04']);
    const [d] = repo.listFixedDeductions(db);
    repo.updateEmployee(db, e.id, { ...base, salary: 3000 }, [{ ...d }]);
    expect(repo.listAdvances(db).every((a) => a.amount === 900)).toBe(true);
    repo.updateEmployee(db, e.id, { ...base, salary: 3000 }, [{ ...d, isActive: false }]);
    expect(repo.listAdvances(db)).toHaveLength(0);
  });

  it('não altera lançamentos de competências fechadas', () => {
    const e = repo.createEmployee(db, base, [pension()]);
    repo.ensurePeriod(db, '2026-01');
    repo.closePeriod(db, '2026-01');
    const [d] = repo.listFixedDeductions(db);
    repo.updateEmployee(db, e.id, { ...base, salary: 5000 }, [d]);
    const jan = repo.listAdvances(db).find((a) => a.period === '2026-01')!;
    expect(jan.amount).toBe(600);
    expect(jan.status).toBe('deducted');
  });
});

describe('fechamento e auditoria', () => {
  it('fecha, bloqueia alterações e reabre com auditoria', () => {
    const e = repo.createEmployee(db, base);
    const a = repo.createAdvance(db, e.id, { amount: 100, time: '09:00', period: '2026-06' });
    expect(repo.closePeriod(db, '2026-06')).toBe(1);
    expect(() => repo.deleteAdvance(db, a.id)).toThrow(/fechada/);
    expect(() => repo.createAdvance(db, e.id, { amount: 10, time: '09:00', period: '2026-06' })).toThrow(/fechada/);
    repo.reopenPeriod(db, '2026-06');
    repo.deleteAdvance(db, a.id);
    const actions = repo.listAudit(db).map((x) => x.action);
    expect(actions).toEqual(expect.arrayContaining(['employee.create', 'advance.create', 'period.close', 'period.reopen', 'advance.delete']));
  });

  it('exclusão de funcionário é lógica e preserva histórico', () => {
    const e = repo.createEmployee(db, base);
    repo.createAdvance(db, e.id, { amount: 100, time: '09:00', period: '2026-06' });
    repo.deleteEmployee(db, e.id);
    expect(repo.listEmployees(db)).toHaveLength(0);
    const n = db.exec('SELECT COUNT(*) FROM advances')[0].values[0][0];
    expect(n).toBe(1);
  });
});

describe('migração do localStorage', () => {
  it('importa tudo, inclusive lançamentos iguais em dias diferentes, apenas uma vez', () => {
    const legacy = JSON.stringify({
      employees: [{ id: 'e1', name: 'João', position: 'A', department: 'B', salary: 1500.1, foodAllowance: 0, transportAllowance: 0, overtime: 0, services: 0, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' }],
      advances: [
        { id: 'a1', employeeId: 'e1', employeeName: 'João', amount: 100, date: '2026-03-10T13:00:00.000Z', time: '10:00', status: 'pending' },
        { id: 'a2', employeeId: 'e1', employeeName: 'João', amount: 100, date: '2026-03-11T13:00:00.000Z', time: '10:00', status: 'deducted' },
      ],
    });
    expect(migrateLegacyData(db, legacy)).toEqual({ employees: 1, advances: 2 });
    expect(migrateLegacyData(db, legacy)).toBeNull();
    const advances = repo.listAdvances(db);
    expect(advances).toHaveLength(2);
    expect(advances.map((a) => a.status).sort()).toEqual(['deducted', 'pending']);
    expect(repo.listEmployees(db)[0].salary).toBe(1500.1);
  });
});

describe('importação Excel (substituição)', () => {
  it('preserva pensão e meses fechados', () => {
    const e = repo.createEmployee(db, base, [pension()]);
    repo.ensurePeriod(db, '2026-01');
    repo.ensurePeriod(db, '2026-02');
    const closedAdv = repo.createAdvance(db, e.id, { amount: 100, time: '09:00', period: '2026-01' });
    repo.closePeriod(db, '2026-01');
    const manual = repo.listAdvances(db).filter((a) => a.source === 'manual');
    repo.replaceWithImported(db, {
      employees: repo.listEmployees(db),
      advances: [...manual.map((a) => ({ ...a, amount: 50 })), { employeeId: e.id, amount: 10, date: '2026-01-15T12:00:00.000Z', period: '2026-01' }],
    });
    repo.ensurePeriod(db, '2026-02');
    const after = repo.listAdvances(db);
    expect(after.filter((a) => a.source === 'fixed').map((a) => a.period).sort()).toEqual(['2026-01', '2026-02']);
    expect(after.find((a) => a.id === closedAdv.id)?.amount).toBe(100);
    expect(after.filter((a) => a.period === '2026-01' && a.source === 'manual')).toHaveLength(1);
  });
});

describe('pensão acima da remuneração', () => {
  it('salva e informa as competências abertas com saldo negativo', () => {
    const e = repo.createEmployee(db, base);
    repo.ensurePeriod(db, '2026-01');
    repo.createAdvance(db, e.id, { amount: 1500, time: '09:00', period: '2026-01' });
    expect(repo.overcommittedPeriods(db, e.id)).toEqual([]);
    repo.updateEmployee(db, e.id, base, [pension({ mode: 'fixed', value: 1500 })]);
    expect(repo.overcommittedPeriods(db, e.id)).toEqual(['2026-01']);
    expect(repo.periodUsage(db, repo.getEmployee(db, e.id)!, '2026-01').remainingCents).toBe(-50000);
    repo.closePeriod(db, '2026-01');
    expect(repo.overcommittedPeriods(db, e.id)).toEqual([]);
  });
});

describe('importação Excel recalcula pensão', () => {
  it('atualiza pensão percentual pendente quando o salário muda', () => {
    const e = repo.createEmployee(db, base, [pension()]);
    repo.ensurePeriod(db, '2026-01');
    repo.replaceWithImported(db, { employees: [{ ...repo.getEmployee(db, e.id)!, salary: 3000 }], advances: [] });
    const fixed = repo.listAdvances(db).filter((a) => a.source === 'fixed' && a.period === '2026-01');
    expect(fixed.map((a) => a.amount)).toEqual([900]);
  });
});
