import { useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Unlock, History, Database, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from './Toast';
import { AuditModal } from './AuditModal';
import { formatPeriod, shiftPeriod } from '../utils/period';

const btn = 'flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors';

export function PeriodBar({ showAdminActions = true }: { showAdminActions?: boolean }) {
  const { selectedPeriod, setSelectedPeriod, isPeriodClosed, closePeriod, reopenPeriod, getAuditLog, backupDatabase, restoreDatabase } = useApp();
  const { showToast } = useToast();
  const [showAudit, setShowAudit] = useState(false);
  const closed = isPeriodClosed(selectedPeriod);
  const label = formatPeriod(selectedPeriod);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) showToast(ok);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  const handleClose = () => {
    if (!window.confirm(`Fechar a competência ${label}? Todos os adiantamentos pendentes serão marcados como descontados e o mês ficará bloqueado para alterações.`)) return;
    run(async () => {
      const n = await closePeriod(selectedPeriod);
      showToast(`Competência ${label} fechada. ${n} adiantamento(s) descontado(s).`);
    });
  };

  const handleReopen = () => {
    if (!window.confirm(`Reabrir a competência ${label}? A reabertura ficará registrada na auditoria.`)) return;
    run(() => reopenPeriod(selectedPeriod), `Competência ${label} reaberta.`);
  };

  const handleRestore = () => {
    if (!window.confirm('Restaurar um backup substitui todos os dados atuais pelos do arquivo. Recomenda-se salvar um backup antes. Continuar?')) return;
    run(async () => {
      if (await restoreDatabase()) showToast('Backup restaurado com sucesso.');
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6 flex flex-wrap items-center gap-3 justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Competência:</span>
        <button className={`${btn} bg-gray-100 dark:bg-gray-700`} onClick={() => setSelectedPeriod(shiftPeriod(selectedPeriod, -1))} aria-label="Mês anterior">
          <ChevronLeft size={16} />
        </button>
        <input
          type="month"
          value={selectedPeriod}
          onChange={(e) => e.target.value && setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm"
          aria-label="Competência"
        />
        <button className={`${btn} bg-gray-100 dark:bg-gray-700`} onClick={() => setSelectedPeriod(shiftPeriod(selectedPeriod, 1))} aria-label="Próximo mês">
          <ChevronRight size={16} />
        </button>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${closed ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
          {closed ? 'Fechada' : 'Aberta'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {closed ? (
          <button className={`${btn} bg-amber-100 text-amber-800 hover:bg-amber-200`} onClick={handleReopen}>
            <Unlock size={16} /><span>Reabrir mês</span>
          </button>
        ) : (
          <button className={`${btn} bg-blue-600 text-white hover:bg-blue-700`} onClick={handleClose}>
            <Lock size={16} /><span>Fechar mês</span>
          </button>
        )}
        <button className={`${btn} bg-gray-100 dark:bg-gray-700 dark:text-gray-200`} onClick={() => setShowAudit(true)}>
          <History size={16} /><span>Auditoria</span>
        </button>
        {showAdminActions && (
          <>
            <button className={`${btn} bg-gray-100 dark:bg-gray-700 dark:text-gray-200`} onClick={() => run(async () => {
              const r = await backupDatabase();
              if (r !== null) showToast('Backup do banco salvo.');
            })}>
              <Database size={16} /><span>Backup</span>
            </button>
            <button className={`${btn} bg-gray-100 dark:bg-gray-700 dark:text-gray-200`} onClick={handleRestore}>
              <Upload size={16} /><span>Restaurar</span>
            </button>
          </>
        )}
      </div>
      {showAudit && <AuditModal entries={getAuditLog()} onClose={() => setShowAudit(false)} />}
    </div>
  );
}
