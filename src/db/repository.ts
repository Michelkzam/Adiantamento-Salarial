import type { Database, SqlValue } from 'sql.js';
import {
  Employee, EmployeeInput, AdvanceRecord, AdvanceInput, FixedDeduction, FixedDeductionInput,
  PayrollPeriod, AuditEntry, AdvanceStatus,
} from '../types';
import { MIGRATIONS, SCHEMA_VERSION } from './schema';
import { toCents, fromCents, percentToBasisPoints, basisPointsToPercent } from '../utils/money';
import { periodOf, isValidPeriod, formatPeriod } from '../utils/period';

export const MAX_ADVANCE_RATIO = 0.6;

export class BusinessError extends Error {}

type Row = Record<string, SqlValue>;

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const now = () => new Date().toISOString();

function all(db: Database, sql: string, params: SqlValue[] = []): Row[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows: Row[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as Row);
    return rows;
  } finally {
    stmt.free();
  }
}

function one(db: Database, sql: string, params: SqlValue[] = []): Row | undefined {
  return all(db, sql, params)[0];
}

function run(db: Database, sql: string, params: SqlValue[] = []): void {
  db.run(sql, params);
}

export function migrate(db: Database): void {
  db.exec('PRAGMA foreign_keys = ON;');
  const current = Number(one(db, 'PRAGMA user_version')?.user_version ?? 0);
  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
}

export function getMeta(db: Database, key: string): string | undefined {
  const r = one(db, 'SELECT value FROM app_meta WHERE key = ?', [key]);
  return r ? String(r.value) : undefined;
}

export function setMeta(db: Database, key: string, value: string): void {
  run(db, 'INSERT INTO app_meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

export function audit(
  db: Database, action: string, entity: string, entityId: string | null, summary: string,
  before?: unknown, after?: unknown,
): void {
  run(db,
    'INSERT INTO audit_log(at, action, entity, entity_id, summary, before_json, after_json) VALUES(?,?,?,?,?,?,?)',
    [now(), action, entity, entityId, summary,
      before === undefined ? null : JSON.stringify(before),
      after === undefined ? null : JSON.stringify(after)]);
}

/* ---------- mapeamento ---------- */

function mapEmployee(r: Row): Employee {
  return {
    id: String(r.id),
    name: String(r.name),
    position: String(r.position),
    department: String(r.department),
    salary: fromCents(Number(r.salary_cents)),
    foodAllowance: fromCents(Number(r.food_cents)),
    transportAllowance: fromCents(Number(r.transport_cents)),
    overtime: fromCents(Number(r.overtime_cents)),
    services: fromCents(Number(r.services_cents)),
    isActive: Number(r.is_active) === 1,
    createdAt: String(r.created_at),
  };
}

function mapAdvance(r: Row): AdvanceRecord {
  return {
    id: String(r.id),
    employeeId: String(r.employee_id),
    employeeName: String(r.employee_name),
    amount: fromCents(Number(r.amount_cents)),
    date: String(r.date),
    time: String(r.time),
    notes: r.notes == null ? undefined : String(r.notes),
    status: String(r.status) as AdvanceStatus,
    period: String(r.period),
    source: String(r.source) as AdvanceRecord['source'],
    fixedDeductionId: r.fixed_deduction_id == null ? null : String(r.fixed_deduction_id),
  };
}

function mapFixed(r: Row): FixedDeduction {
  const mode = String(r.mode) as FixedDeduction['mode'];
  return {
    id: String(r.id),
    employeeId: String(r.employee_id),
    kind: String(r.kind) as FixedDeduction['kind'],
    description: String(r.description),
    mode,
    value: mode === 'fixed' ? fromCents(Number(r.value)) : basisPointsToPercent(Number(r.value)),
    base: String(r.base) as FixedDeduction['base'],
    isActive: Number(r.is_active) === 1,
    startPeriod: String(r.start_period),
    endPeriod: r.end_period == null ? null : String(r.end_period),
  };
}

function mapPeriod(r: Row): PayrollPeriod {
  return {
    yearMonth: String(r.year_month),
    status: String(r.status) as PayrollPeriod['status'],
    closedAt: r.closed_at == null ? null : String(r.closed_at),
  };
}

/* ---------- consultas ---------- */

export function listEmployees(db: Database): Employee[] {
  return all(db, 'SELECT * FROM employees WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE').map(mapEmployee);
}

export function getEmployee(db: Database, id: string): Employee | undefined {
  const r = one(db, 'SELECT * FROM employees WHERE id = ? AND deleted_at IS NULL', [id]);
  return r ? mapEmployee(r) : undefined;
}

export function listAdvances(db: Database): AdvanceRecord[] {
  return all(db,
    `SELECT a.* FROM advances a JOIN employees e ON e.id = a.employee_id
     WHERE a.deleted_at IS NULL AND e.deleted_at IS NULL ORDER BY a.date DESC`).map(mapAdvance);
}

export function listFixedDeductions(db: Database): FixedDeduction[] {
  return all(db, 'SELECT * FROM fixed_deductions WHERE deleted_at IS NULL ORDER BY created_at').map(mapFixed);
}

export function listPeriods(db: Database): PayrollPeriod[] {
  return all(db, 'SELECT * FROM payroll_periods ORDER BY year_month DESC').map(mapPeriod);
}

export function listAudit(db: Database, limit = 500): AuditEntry[] {
  return all(db, 'SELECT * FROM audit_log ORDER BY id DESC LIMIT ?', [limit]).map((r) => ({
    id: Number(r.id),
    at: String(r.at),
    action: String(r.action),
    entity: String(r.entity),
    entityId: r.entity_id == null ? null : String(r.entity_id),
    summary: String(r.summary),
    before: r.before_json == null ? null : String(r.before_json),
    after: r.after_json == null ? null : String(r.after_json),
  }));
}

/* ---------- regras de cálculo (centavos) ---------- */

export function totalSalaryCents(e: Employee): number {
  return toCents(e.salary) + toCents(e.foodAllowance) + toCents(e.transportAllowance)
    + toCents(e.overtime) + toCents(e.services);
}

export function fixedAmountCents(e: Employee, d: Pick<FixedDeduction, 'mode' | 'value' | 'base'>): number {
  if (d.mode === 'fixed') return toCents(d.value);
  const base = d.base === 'total' ? totalSalaryCents(e) : toCents(e.salary);
  return Math.round((base * percentToBasisPoints(d.value)) / 10000);
}

export interface PeriodUsage {
  totalCents: number;
  manualCents: number;
  fixedCents: number;
  remainingCents: number;
  maxManualCents: number;
}

export function periodUsage(db: Database, employee: Employee, period: string): PeriodUsage {
  const r = one(db,
    `SELECT COALESCE(SUM(CASE WHEN source = 'manual' THEN amount_cents END), 0) AS manual,
            COALESCE(SUM(CASE WHEN source = 'fixed' THEN amount_cents END), 0) AS fixed
     FROM advances WHERE employee_id = ? AND period = ? AND deleted_at IS NULL`,
    [employee.id, period]);
  const totalCents = totalSalaryCents(employee);
  const manualCents = Number(r?.manual ?? 0);
  const fixedCents = Number(r?.fixed ?? 0);
  const remainingCents = totalCents - manualCents - fixedCents;
  const maxManualCents = Math.max(0, Math.min(Math.round(totalCents * MAX_ADVANCE_RATIO) - manualCents, remainingCents));
  return { totalCents, manualCents, fixedCents, remainingCents, maxManualCents };
}

/** Competências abertas em que avulsos + fixos ultrapassam a remuneração do funcionário. */
export function overcommittedPeriods(db: Database, employeeId: string): string[] {
  const employee = getEmployee(db, employeeId);
  if (!employee) return [];
  return all(db,
    `SELECT DISTINCT a.period FROM advances a JOIN payroll_periods p ON p.year_month = a.period
     WHERE a.employee_id = ? AND a.deleted_at IS NULL AND p.status = 'open' ORDER BY a.period`,
    [employeeId])
    .map((r) => String(r.period))
    .filter((period) => periodUsage(db, employee, period).remainingCents < 0);
}

/* ---------- competências ---------- */

export function getPeriod(db: Database, period: string): PayrollPeriod | undefined {
  const r = one(db, 'SELECT * FROM payroll_periods WHERE year_month = ?', [period]);
  return r ? mapPeriod(r) : undefined;
}

function insertPeriodIfMissing(db: Database, period: string): PayrollPeriod {
  if (!isValidPeriod(period)) throw new BusinessError(`Competência inválida: ${period}`);
  const existing = getPeriod(db, period);
  if (existing) return existing;
  run(db, 'INSERT INTO payroll_periods(year_month, status, created_at) VALUES(?, \'open\', ?)', [period, now()]);
  return { yearMonth: period, status: 'open', closedAt: null };
}

function assertOpen(db: Database, period: string): void {
  const p = insertPeriodIfMissing(db, period);
  if (p.status === 'closed') {
    throw new BusinessError(`A competência ${formatPeriod(period)} está fechada. Reabra-a para fazer alterações.`);
  }
}

/** Garante a competência e gera os adiantamentos fixos que ainda não existem. */
export function ensurePeriod(db: Database, period: string): PayrollPeriod {
  const p = insertPeriodIfMissing(db, period);
  if (p.status === 'open') {
    for (const e of listEmployees(db)) syncFixedForEmployeePeriod(db, e, period);
  }
  return p;
}

function deductionApplies(e: Employee, d: FixedDeduction, period: string): boolean {
  return e.isActive && d.isActive && d.startPeriod <= period && (!d.endPeriod || d.endPeriod >= period);
}

function syncFixedForEmployeePeriod(db: Database, e: Employee, period: string): void {
  const deductions = all(db, 'SELECT * FROM fixed_deductions WHERE employee_id = ?', [e.id]).map((r) => ({
    d: mapFixed(r), deleted: r.deleted_at != null,
  }));
  for (const { d, deleted } of deductions) {
    const row = one(db, 'SELECT * FROM advances WHERE fixed_deduction_id = ? AND period = ?', [d.id, period]);
    const amount = fixedAmountCents(e, d);
    const applies = !deleted && deductionApplies(e, d, period) && amount > 0;
    if (applies && !row) {
      const id = generateId();
      run(db,
        `INSERT INTO advances(id, employee_id, employee_name, period, amount_cents, date, time, notes, status, source, fixed_deduction_id, created_at)
         VALUES(?,?,?,?,?,?,?,?, 'pending', 'fixed', ?, ?)`,
        [id, e.id, e.name, period, amount, new Date(`${period}-01T12:00:00`).toISOString(), '00:00', d.description, d.id, now()]);
      audit(db, 'advance.fixed_generated', 'advance', id,
        `Adiantamento fixo "${d.description}" gerado para ${e.name} em ${formatPeriod(period)}: R$ ${(amount / 100).toFixed(2)}`,
        undefined, { amountCents: amount, period });
    } else if (row && row.deleted_at == null && String(row.status) === 'pending') {
      if (applies && (Number(row.amount_cents) !== amount || String(row.notes) !== d.description || String(row.employee_name) !== e.name)) {
        run(db, 'UPDATE advances SET amount_cents = ?, notes = ?, employee_name = ?, updated_at = ? WHERE id = ?',
          [amount, d.description, e.name, now(), String(row.id)]);
        audit(db, 'advance.fixed_recalculated', 'advance', String(row.id),
          `Adiantamento fixo "${d.description}" de ${e.name} recalculado em ${formatPeriod(period)}`,
          { amountCents: Number(row.amount_cents) }, { amountCents: amount });
      } else if (!applies) {
        run(db, 'DELETE FROM advances WHERE id = ?', [String(row.id)]);
        audit(db, 'advance.fixed_removed', 'advance', String(row.id),
          `Adiantamento fixo "${d.description}" de ${e.name} removido de ${formatPeriod(period)} (desativado)`,
          mapAdvance(row));
      }
    }
  }
}

function syncFixedForEmployee(db: Database, employeeId: string): void {
  const e = one(db, 'SELECT * FROM employees WHERE id = ?', [employeeId]);
  if (!e) return;
  const emp = mapEmployee(e);
  const deleted = e.deleted_at != null;
  for (const p of listPeriods(db).filter((x) => x.status === 'open')) {
    if (deleted) emp.isActive = false;
    syncFixedForEmployeePeriod(db, emp, p.yearMonth);
  }
}

export function closePeriod(db: Database, period: string): number {
  const p = insertPeriodIfMissing(db, period);
  if (p.status === 'closed') throw new BusinessError(`A competência ${formatPeriod(period)} já está fechada.`);
  ensurePeriod(db, period);
  const pending = Number(one(db,
    "SELECT COUNT(*) AS n FROM advances WHERE period = ? AND status = 'pending' AND deleted_at IS NULL", [period])?.n ?? 0);
  run(db, "UPDATE advances SET status = 'deducted', updated_at = ? WHERE period = ? AND status = 'pending' AND deleted_at IS NULL", [now(), period]);
  run(db, "UPDATE payroll_periods SET status = 'closed', closed_at = ? WHERE year_month = ?", [now(), period]);
  audit(db, 'period.close', 'period', period, `Competência ${formatPeriod(period)} fechada (${pending} adiantamento(s) descontado(s))`);
  return pending;
}

export function reopenPeriod(db: Database, period: string): void {
  const p = getPeriod(db, period);
  if (!p || p.status === 'open') throw new BusinessError(`A competência ${formatPeriod(period)} já está aberta.`);
  run(db, "UPDATE payroll_periods SET status = 'open', closed_at = NULL WHERE year_month = ?", [period]);
  audit(db, 'period.reopen', 'period', period, `Competência ${formatPeriod(period)} reaberta`);
}

/* ---------- funcionários ---------- */

function employeeParams(data: EmployeeInput): SqlValue[] {
  return [data.name.trim(), data.position.trim(), data.department.trim(),
    toCents(data.salary), toCents(data.foodAllowance), toCents(data.transportAllowance),
    toCents(data.overtime), toCents(data.services), data.isActive ? 1 : 0];
}

function validateFixed(list: FixedDeductionInput[]): void {
  for (const d of list) {
    if (!d.description.trim()) throw new BusinessError('Informe a descrição do adiantamento fixo.');
    if (!(d.value > 0)) throw new BusinessError(`Informe um valor maior que zero para "${d.description}".`);
    if (d.mode === 'percent' && d.value > 100) throw new BusinessError(`Percentual inválido para "${d.description}".`);
    if (!isValidPeriod(d.startPeriod)) throw new BusinessError(`Competência inicial inválida para "${d.description}".`);
    if (d.endPeriod && (!isValidPeriod(d.endPeriod) || d.endPeriod < d.startPeriod)) {
      throw new BusinessError(`Competência final inválida para "${d.description}".`);
    }
  }
}

function saveFixedDeductions(db: Database, employeeId: string, list: FixedDeductionInput[]): void {
  validateFixed(list);
  const existing = all(db, 'SELECT * FROM fixed_deductions WHERE employee_id = ? AND deleted_at IS NULL', [employeeId]).map(mapFixed);
  const keep = new Set(list.filter((d) => d.id).map((d) => d.id));
  for (const old of existing) {
    if (!keep.has(old.id)) {
      run(db, 'UPDATE fixed_deductions SET deleted_at = ?, is_active = 0 WHERE id = ?', [now(), old.id]);
      audit(db, 'fixed.delete', 'fixed_deduction', old.id, `Adiantamento fixo "${old.description}" removido`, old);
    }
  }
  for (const d of list) {
    const stored = d.mode === 'fixed' ? toCents(d.value) : percentToBasisPoints(d.value);
    const params: SqlValue[] = [d.kind, d.description.trim(), d.mode, stored, d.base, d.isActive ? 1 : 0, d.startPeriod, d.endPeriod || null];
    const old = d.id ? existing.find((x) => x.id === d.id) : undefined;
    if (old) {
      run(db,
        `UPDATE fixed_deductions SET kind=?, description=?, mode=?, value=?, base=?, is_active=?, start_period=?, end_period=?, updated_at=? WHERE id=?`,
        [...params, now(), old.id]);
      audit(db, 'fixed.update', 'fixed_deduction', old.id, `Adiantamento fixo "${d.description}" alterado`, old, d);
    } else {
      const id = generateId();
      run(db,
        `INSERT INTO fixed_deductions(kind, description, mode, value, base, is_active, start_period, end_period, id, employee_id, created_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        [...params, id, employeeId, now()]);
      audit(db, 'fixed.create', 'fixed_deduction', id, `Adiantamento fixo "${d.description}" cadastrado`, undefined, d);
    }
  }
}

export function createEmployee(db: Database, data: EmployeeInput, fixed: FixedDeductionInput[] = []): Employee {
  if (!data.name.trim()) throw new BusinessError('Informe o nome do funcionário.');
  const id = generateId();
  const createdAt = now();
  run(db,
    `INSERT INTO employees(name, position, department, salary_cents, food_cents, transport_cents, overtime_cents, services_cents, is_active, id, created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [...employeeParams(data), id, createdAt]);
  const emp = getEmployee(db, id)!;
  audit(db, 'employee.create', 'employee', id, `Funcionário "${emp.name}" cadastrado`, undefined, emp);
  saveFixedDeductions(db, id, fixed);
  syncFixedForEmployee(db, id);
  return emp;
}

export function updateEmployee(db: Database, id: string, data: EmployeeInput, fixed?: FixedDeductionInput[]): Employee {
  const before = getEmployee(db, id);
  if (!before) throw new BusinessError('Funcionário não encontrado.');
  run(db,
    `UPDATE employees SET name=?, position=?, department=?, salary_cents=?, food_cents=?, transport_cents=?, overtime_cents=?, services_cents=?, is_active=?, updated_at=? WHERE id=?`,
    [...employeeParams(data), now(), id]);
  const after = getEmployee(db, id)!;
  audit(db, 'employee.update', 'employee', id, `Funcionário "${after.name}" alterado`, before, after);
  if (fixed) saveFixedDeductions(db, id, fixed);
  syncFixedForEmployee(db, id);
  return after;
}

export function deleteEmployee(db: Database, id: string): void {
  const before = getEmployee(db, id);
  if (!before) return;
  run(db, 'UPDATE employees SET deleted_at = ?, is_active = 0 WHERE id = ?', [now(), id]);
  syncFixedForEmployee(db, id);
  audit(db, 'employee.delete', 'employee', id, `Funcionário "${before.name}" excluído (histórico preservado)`, before);
}

/* ---------- adiantamentos ---------- */

export function createAdvance(db: Database, employeeId: string, data: AdvanceInput): AdvanceRecord {
  const emp = getEmployee(db, employeeId);
  if (!emp) throw new BusinessError('Funcionário não encontrado.');
  const date = data.date || now();
  const period = data.period || periodOf(date);
  assertOpen(db, period);
  ensurePeriod(db, period);
  const amount = toCents(data.amount);
  if (amount <= 0) throw new BusinessError('Informe um valor maior que zero.');
  const usage = periodUsage(db, emp, period);
  if (amount > usage.maxManualCents) {
    throw new BusinessError(
      `Valor acima do disponível em ${formatPeriod(period)}. Máximo: R$ ${(usage.maxManualCents / 100).toFixed(2).replace('.', ',')}`);
  }
  const id = generateId();
  run(db,
    `INSERT INTO advances(id, employee_id, employee_name, period, amount_cents, date, time, notes, status, source, created_at)
     VALUES(?,?,?,?,?,?,?,?, 'pending', 'manual', ?)`,
    [id, emp.id, emp.name, period, amount, date, data.time, data.notes?.trim() || null, now()]);
  const adv = mapAdvance(one(db, 'SELECT * FROM advances WHERE id = ?', [id])!);
  audit(db, 'advance.create', 'advance', id,
    `Adiantamento de R$ ${adv.amount.toFixed(2)} para ${emp.name} (${formatPeriod(period)})`, undefined, adv);
  return adv;
}

function getAdvanceRow(db: Database, id: string): AdvanceRecord {
  const r = one(db, 'SELECT * FROM advances WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!r) throw new BusinessError('Adiantamento não encontrado.');
  return mapAdvance(r);
}

export function deleteAdvance(db: Database, id: string): void {
  const adv = getAdvanceRow(db, id);
  assertOpen(db, adv.period);
  run(db, 'UPDATE advances SET deleted_at = ?, updated_at = ? WHERE id = ?', [now(), now(), id]);
  audit(db, 'advance.delete', 'advance', id,
    `Adiantamento de R$ ${adv.amount.toFixed(2)} de ${adv.employeeName} excluído (${formatPeriod(adv.period)})`, adv);
}

export function markAdvanceDeducted(db: Database, id: string): void {
  const adv = getAdvanceRow(db, id);
  assertOpen(db, adv.period);
  if (adv.status === 'deducted') return;
  run(db, "UPDATE advances SET status = 'deducted', updated_at = ? WHERE id = ?", [now(), id]);
  audit(db, 'advance.deduct', 'advance', id,
    `Adiantamento de R$ ${adv.amount.toFixed(2)} de ${adv.employeeName} marcado como descontado`, { status: adv.status }, { status: 'deducted' });
}

/* ---------- importação (legado / Excel) ---------- */

export interface ImportPayload {
  employees: Partial<Employee>[];
  advances: Partial<AdvanceRecord>[];
}

/** Insere dados sem descartar registros. Usado na migração do localStorage e na importação Excel. */
export interface ImportResult {
  employees: number;
  advances: number;
  /** Adiantamentos ignorados por pertencerem a competências fechadas. */
  skippedClosed: number;
}

export function insertImported(db: Database, payload: ImportPayload, action: string, summary: string): ImportResult {
  let nEmp = 0;
  let nAdv = 0;
  let skippedClosed = 0;
  for (const e of payload.employees) {
    if (!e.name) continue;
    const id = e.id ? String(e.id) : generateId();
    if (one(db, 'SELECT 1 AS x FROM employees WHERE id = ?', [id])) continue;
    run(db,
      `INSERT INTO employees(name, position, department, salary_cents, food_cents, transport_cents, overtime_cents, services_cents, is_active, id, created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      [...employeeParams({
        name: String(e.name), position: String(e.position ?? ''), department: String(e.department ?? ''),
        salary: Number(e.salary) || 0, foodAllowance: Number(e.foodAllowance) || 0,
        transportAllowance: Number(e.transportAllowance) || 0, overtime: Number(e.overtime) || 0,
        services: Number(e.services) || 0, isActive: e.isActive !== false,
      }), id, e.createdAt ? String(e.createdAt) : now()]);
    nEmp++;
  }
  for (const a of payload.advances) {
    const amount = toCents(Number(a.amount));
    if (!a.employeeId || amount <= 0) continue;
    const emp = one(db, 'SELECT id, name FROM employees WHERE id = ?', [String(a.employeeId)]);
    if (!emp) continue;
    const id = a.id ? String(a.id) : generateId();
    if (one(db, 'SELECT 1 AS x FROM advances WHERE id = ?', [id])) continue;
    const date = a.date ? new Date(a.date).toISOString() : now();
    const period = a.period && isValidPeriod(a.period) ? a.period : periodOf(date);
    if (insertPeriodIfMissing(db, period).status === 'closed') {
      skippedClosed++;
      continue;
    }
    run(db,
      `INSERT INTO advances(id, employee_id, employee_name, period, amount_cents, date, time, notes, status, source, created_at)
       VALUES(?,?,?,?,?,?,?,?,?, 'manual', ?)`,
      [id, String(emp.id), String(a.employeeName || emp.name), period, amount, date,
        String(a.time || '00:00'), a.notes ? String(a.notes) : null,
        a.status === 'deducted' ? 'deducted' : 'pending', now()]);
    nAdv++;
  }
  const skippedText = skippedClosed ? `, ${skippedClosed} ignorado(s) por competência fechada` : '';
  audit(db, action, 'database', null, `${summary}: ${nEmp} funcionário(s), ${nAdv} adiantamento(s)${skippedText}`);
  return { employees: nEmp, advances: nAdv, skippedClosed };
}

/** Substitui os dados (importação Excel). Registros atuais são excluídos logicamente, nunca apagados. */
export function replaceWithImported(db: Database, payload: ImportPayload): ImportResult {
  const ts = now();
  run(db,
    `UPDATE advances SET deleted_at = ? WHERE deleted_at IS NULL AND source = 'manual'
       AND period NOT IN (SELECT year_month FROM payroll_periods WHERE status = 'closed')`, [ts]);
  run(db, 'UPDATE employees SET deleted_at = ? WHERE deleted_at IS NULL', [ts]);
  for (const e of payload.employees) {
    if (!e.id || !e.name || !one(db, 'SELECT 1 AS x FROM employees WHERE id = ?', [String(e.id)])) continue;
    run(db,
      `UPDATE employees SET name=?, position=?, department=?, salary_cents=?, food_cents=?, transport_cents=?, overtime_cents=?, services_cents=?, is_active=?, deleted_at=NULL, updated_at=? WHERE id=?`,
      [...employeeParams({
        name: String(e.name), position: String(e.position ?? ''), department: String(e.department ?? ''),
        salary: Number(e.salary) || 0, foodAllowance: Number(e.foodAllowance) || 0,
        transportAllowance: Number(e.transportAllowance) || 0, overtime: Number(e.overtime) || 0,
        services: Number(e.services) || 0, isActive: e.isActive !== false,
      }), ts, String(e.id)]);
  }
  for (const a of payload.advances) {
    const amount = toCents(Number(a.amount));
    if (!a.id || amount <= 0) continue;
    const existing = one(db, 'SELECT period, source FROM advances WHERE id = ?', [String(a.id)]);
    if (!existing || existing.source !== 'manual' || getPeriod(db, String(existing.period))?.status === 'closed') continue;
    run(db, 'UPDATE advances SET amount_cents=?, status=?, notes=?, deleted_at=NULL, updated_at=? WHERE id=?',
      [amount, a.status === 'deducted' ? 'deducted' : 'pending', a.notes ? String(a.notes) : null, ts, String(a.id)]);
  }
  const result = insertImported(db, payload, 'data.import_excel', 'Importação Excel (substituição)');
  for (const r of all(db, 'SELECT id FROM employees')) syncFixedForEmployee(db, String(r.id));
  return result;
}
