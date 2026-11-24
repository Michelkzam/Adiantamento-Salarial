import { Plus, Trash2, Scale } from 'lucide-react';
import type { FixedDeductionInput } from '../types';
import { formatBRL } from '../utils/currency';
import { periodOf } from '../utils/period';

export interface FixedDeductionDraft extends Omit<FixedDeductionInput, 'value'> {
  key: string;
  value: string;
}

interface Props {
  items: FixedDeductionDraft[];
  onChange: (items: FixedDeductionDraft[]) => void;
  salary: number;
  totalSalary: number;
}

export function newFixedDraft(): FixedDeductionDraft {
  return {
    key: Math.random().toString(36).slice(2),
    kind: 'pension',
    description: 'Pensão alimentícia',
    mode: 'percent',
    value: '',
    base: 'salary',
    isActive: true,
    startPeriod: periodOf(),
    endPeriod: null,
  };
}

export function draftAmount(d: FixedDeductionDraft, salary: number, totalSalary: number): number {
  const v = parseFloat(d.value) || 0;
  if (d.mode === 'fixed') return v;
  return Math.round((d.base === 'total' ? totalSalary : salary) * v) / 100;
}

const input = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500';
const label = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

export function FixedDeductionsEditor({ items, onChange, salary, totalSalary }: Props) {
  const update = (key: string, patch: Partial<FixedDeductionDraft>) =>
    onChange(items.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Scale size={18} className="text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Adiantamentos fixos (pensão alimentícia)</h3>
        </div>
        <button
          type="button"
          onClick={() => onChange([...items, newFixedDraft()])}
          className="flex items-center space-x-1 text-sm text-purple-700 dark:text-purple-300 hover:underline"
        >
          <Plus size={16} /><span>Adicionar</span>
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Nenhum desconto fixo. Use "Adicionar" para cadastrar pensão alimentícia ou outro valor fixo mensal.
        </p>
      )}
      {items.map((d) => (
        <div key={d.key} className="bg-purple-50/60 dark:bg-purple-900/10 rounded-lg p-3 space-y-3" data-testid="fixed-deduction">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-800 dark:text-gray-200">
              <input
                type="checkbox"
                checked={d.isActive}
                onChange={(e) => update(d.key, { isActive: e.target.checked })}
                className="w-4 h-4 accent-purple-600"
              />
              <span>Habilitado</span>
            </label>
            <button type="button" onClick={() => onChange(items.filter((x) => x.key !== d.key))}
              className="text-red-600 hover:text-red-700" title="Remover">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Tipo</label>
              <select className={input} value={d.kind}
                onChange={(e) => {
                  const kind = e.target.value as FixedDeductionDraft['kind'];
                  update(d.key, { kind, description: kind === 'pension' && !d.description ? 'Pensão alimentícia' : d.description });
                }}>
                <option value="pension">Pensão alimentícia</option>
                <option value="other">Outro desconto fixo</option>
              </select>
            </div>
            <div>
              <label className={label}>Descrição</label>
              <input className={input} value={d.description} onChange={(e) => update(d.key, { description: e.target.value })}
                placeholder="Ex.: Pensão - Processo nº ..." />
            </div>
            <div>
              <label className={label}>Forma de cálculo</label>
              <select className={input} value={d.mode} onChange={(e) => update(d.key, { mode: e.target.value as FixedDeductionDraft['mode'] })}>
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className={label}>{d.mode === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}</label>
              <input className={input} type="number" min="0" step="0.01" max={d.mode === 'percent' ? 100 : undefined}
                value={d.value} onChange={(e) => update(d.key, { value: e.target.value })} />
            </div>
            {d.mode === 'percent' && (
              <div className="col-span-2">
                <label className={label}>Base do percentual (conforme decisão judicial)</label>
                <select className={input} value={d.base} onChange={(e) => update(d.key, { base: e.target.value as FixedDeductionDraft['base'] })}>
                  <option value="salary">Salário base</option>
                  <option value="total">Remuneração total</option>
                </select>
              </div>
            )}
            <div>
              <label className={label}>Início (competência)</label>
              <input className={input} type="month" value={d.startPeriod} onChange={(e) => update(d.key, { startPeriod: e.target.value })} />
            </div>
            <div>
              <label className={label}>Fim (opcional)</label>
              <input className={input} type="month" value={d.endPeriod ?? ''} onChange={(e) => update(d.key, { endPeriod: e.target.value || null })} />
            </div>
          </div>
          <p className="text-xs text-purple-800 dark:text-purple-300">
            Valor mensal: <strong>{formatBRL(draftAmount(d, salary, totalSalary))}</strong>
            {!d.isActive && ' (desabilitado)'}
          </p>
        </div>
      ))}
    </div>
  );
}
