import { useMemo, useState } from 'react';
import { X, History } from 'lucide-react';
import type { AuditEntry } from '../types';

interface Props {
  entries: AuditEntry[];
  onClose: () => void;
}

const ENTITY_LABEL: Record<string, string> = {
  employee: 'Funcionário', advance: 'Adiantamento', fixed_deduction: 'Adiant. fixo', period: 'Competência', database: 'Banco de dados',
};

export function AuditModal({ entries, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? entries.filter((e) => e.summary.toLowerCase().includes(f) || e.action.includes(f)) : entries;
  }, [entries, filter]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <History className="text-blue-600" size={22} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Auditoria</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Fechar"><X size={22} /></button>
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por funcionário, ação, valor..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm dark:text-white"
          />
        </div>
        <div className="overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="px-4 py-2 whitespace-nowrap">Data/hora</th>
                <th className="px-4 py-2">Registro</th>
                <th className="px-4 py-2">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id} className="border-t border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200" title={[e.before && `Antes: ${e.before}`, e.after && `Depois: ${e.after}`].filter(Boolean).join('\n')}>
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(e.at).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{ENTITY_LABEL[e.entity] ?? e.entity}</td>
                  <td className="px-4 py-2">{e.summary}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">Nenhum registro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
