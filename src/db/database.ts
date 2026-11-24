const STORAGE_KEY = 'adiantamento_salarial_data';

interface StorageData {
  employees: unknown[];
  advances: unknown[];
}

let data: StorageData = { employees: [], advances: [] };

export function initDatabase(): void {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray(parsed.employees) &&
        Array.isArray(parsed.advances)
      ) {
        data = parsed;
      } else {
        data = { employees: [], advances: [] };
      }
    } catch {
      data = { employees: [], advances: [] };
    }
  }
}

function persist(): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    console.error('Erro ao salvar dados no localStorage. Armazenamento pode estar cheio.');
    return false;
  }
}

export function loadEmployees<T>(): T[] {
  return [...((data.employees || []) as T[])];
}

export function loadAdvances<T>(): T[] {
  return [...((data.advances || []) as T[])];
}

export function saveEmployees(employees: unknown[]): void {
  data.employees = employees;
  persist();
}

export function saveAdvances(advances: unknown[]): void {
  data.advances = advances;
  persist();
}

export function replaceAll(employees: unknown[], advances: unknown[]): void {
  data = { employees, advances };
  persist();
}
