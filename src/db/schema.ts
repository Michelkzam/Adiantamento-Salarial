export const SCHEMA_VERSION = 2;

export const MIGRATIONS: Record<number, string> = {
  2: `
CREATE TABLE period_salary_snapshots (
  year_month TEXT NOT NULL REFERENCES payroll_periods(year_month),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  salary_cents INTEGER NOT NULL,
  food_cents INTEGER NOT NULL,
  transport_cents INTEGER NOT NULL,
  overtime_cents INTEGER NOT NULL,
  services_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (year_month, employee_id)
);
`,
  1: `
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  salary_cents INTEGER NOT NULL DEFAULT 0 CHECK (salary_cents >= 0),
  food_cents INTEGER NOT NULL DEFAULT 0 CHECK (food_cents >= 0),
  transport_cents INTEGER NOT NULL DEFAULT 0 CHECK (transport_cents >= 0),
  overtime_cents INTEGER NOT NULL DEFAULT 0 CHECK (overtime_cents >= 0),
  services_cents INTEGER NOT NULL DEFAULT 0 CHECK (services_cents >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE payroll_periods (
  year_month TEXT PRIMARY KEY CHECK (year_month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE fixed_deductions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('pension', 'other')),
  description TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('fixed', 'percent')),
  value INTEGER NOT NULL CHECK (value >= 0),
  base TEXT NOT NULL DEFAULT 'salary' CHECK (base IN ('salary', 'total')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  start_period TEXT NOT NULL,
  end_period TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT
);
CREATE INDEX ix_fixed_employee ON fixed_deductions(employee_id);

CREATE TABLE advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  employee_name TEXT NOT NULL,
  period TEXT NOT NULL REFERENCES payroll_periods(year_month) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deducted')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'fixed')),
  fixed_deduction_id TEXT REFERENCES fixed_deductions(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT
);
CREATE UNIQUE INDEX ux_advances_fixed_period ON advances(fixed_deduction_id, period)
  WHERE fixed_deduction_id IS NOT NULL;
CREATE INDEX ix_advances_employee_period ON advances(employee_id, period);
CREATE INDEX ix_advances_period ON advances(period);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT
);
CREATE INDEX ix_audit_at ON audit_log(at);
CREATE INDEX ix_audit_entity ON audit_log(entity, entity_id);

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`,
};
