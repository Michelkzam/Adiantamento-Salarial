import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database, SqlJsStatic } from 'sql.js';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { migrate, getMeta, setMeta, insertImported } from './repository';

export const LEGACY_STORAGE_KEY = 'adiantamento_salarial_data';
const WEB_DB_KEY = 'adiantamento_sqlite_db';
const NATIVE_DB_FILE = 'adiantamento.sqlite';

interface ElectronAPI {
  dbLoad: () => Promise<Uint8Array | null>;
  dbSave: (bytes: Uint8Array) => Promise<{ success: boolean; error?: string }>;
  dbExport: (bytes: Uint8Array) => Promise<{ success: boolean; canceled?: boolean; error?: string; filePath?: string }>;
  dbImport: () => Promise<Uint8Array | null>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface StorageAdapter {
  load(): Promise<Uint8Array | null>;
  save(bytes: Uint8Array): Promise<void>;
}

const electronStorage = (api: ElectronAPI): StorageAdapter => ({
  load: () => api.dbLoad(),
  async save(bytes) {
    const res = await api.dbSave(bytes);
    if (!res.success) throw new Error(res.error || 'erro desconhecido');
  },
});

const nativeStorage: StorageAdapter = {
  async load() {
    try {
      const res = await Filesystem.readFile({ path: NATIVE_DB_FILE, directory: Directory.Data });
      return typeof res.data === 'string' ? fromBase64(res.data) : new Uint8Array(await res.data.arrayBuffer());
    } catch {
      return null;
    }
  },
  async save(bytes) {
    await Filesystem.writeFile({ path: NATIVE_DB_FILE, directory: Directory.Data, data: toBase64(bytes) });
  },
};

const webStorage: StorageAdapter = {
  async load() {
    const saved = localStorage.getItem(WEB_DB_KEY);
    return saved ? fromBase64(saved) : null;
  },
  async save(bytes) {
    localStorage.setItem(WEB_DB_KEY, toBase64(bytes));
  },
};

function pickStorage(): StorageAdapter {
  if (typeof window !== 'undefined' && window.electronAPI?.dbLoad) return electronStorage(window.electronAPI);
  if (Capacitor.isNativePlatform()) return nativeStorage;
  return webStorage;
}

let SQL: SqlJsStatic | null = null;

export class AppDatabase {
  private saving: Promise<void> = Promise.resolve();

  private lastSaved: Uint8Array;

  constructor(public db: Database, private storage: StorageAdapter) {
    this.lastSaved = db.export();
    db.exec('PRAGMA foreign_keys = ON;');
  }

  private rollbackToLastSaved(): void {
    if (!SQL) return;
    this.db.close();
    this.db = new SQL.Database(this.lastSaved);
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  /** Executa `fn` numa transação e grava o arquivo. Lança erro se a gravação falhar. */
  async write<T>(fn: (db: Database) => T): Promise<T> {
    this.db.exec('BEGIN');
    let result: T;
    try {
      result = fn(this.db);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    await this.persist();
    return result;
  }

  async persist(): Promise<void> {
    const bytes = this.db.export();
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.saving = this.saving.catch(() => undefined).then(() => this.storage.save(bytes));
    try {
      await this.saving;
      this.lastSaved = bytes;
    } catch (e) {
      this.rollbackToLastSaved();
      throw new Error(`Falha ao gravar o banco de dados: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  exportBytes(): Uint8Array {
    const bytes = this.db.export();
    this.db.exec('PRAGMA foreign_keys = ON;');
    return bytes;
  }

  async replaceWith(bytes: Uint8Array): Promise<void> {
    if (!SQL) throw new Error('Banco não inicializado');
    const next = new SQL.Database(bytes);
    try {
      const tables = next.exec("SELECT name FROM sqlite_master WHERE type = 'table'")[0]?.values.flat() ?? [];
      const version = Number(next.exec('PRAGMA user_version')[0]?.values[0][0] ?? 0);
      if (version < 1 || !['employees', 'advances', 'payroll_periods'].every((t) => tables.includes(t))) {
        throw new Error('O arquivo selecionado não é um backup deste sistema.');
      }
      migrate(next);
      if (!getMeta(next, 'legacy_migrated_at')) setMeta(next, 'legacy_migrated_at', new Date().toISOString());
    } catch (e) {
      next.close();
      throw e;
    }
    this.db.close();
    this.db = next;
    await this.persist();
  }
}

/** Importa o JSON do localStorage antigo (v2.0) uma única vez. O JSON é preservado como cópia de segurança. */
export function migrateLegacyData(db: Database, raw: string | null): { employees: number; advances: number } | null {
  if (getMeta(db, 'legacy_migrated_at') || !raw) return null;
  let parsed: { employees?: unknown[]; advances?: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || !Array.isArray(parsed.employees) || !Array.isArray(parsed.advances)) return null;
  db.exec('BEGIN');
  try {
    const res = insertImported(db, parsed as never, 'data.migrate_legacy', 'Migração dos dados da versão anterior (localStorage)');
    setMeta(db, 'legacy_migrated_at', new Date().toISOString());
    db.exec('COMMIT');
    return res;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export async function openDatabase(storage: StorageAdapter = pickStorage()): Promise<AppDatabase> {
  SQL = SQL ?? await initSqlJs();
  const bytes = await storage.load();
  const db = bytes ? new SQL.Database(bytes) : new SQL.Database();
  migrate(db);
  const app = new AppDatabase(db, storage);
  const legacy = typeof localStorage !== 'undefined' ? localStorage.getItem(LEGACY_STORAGE_KEY) : null;
  const migrated = migrateLegacyData(db, legacy);
  if (!bytes || migrated) await app.persist();
  return app;
}
