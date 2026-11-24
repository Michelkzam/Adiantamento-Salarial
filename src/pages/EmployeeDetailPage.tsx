import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, FileText, Calendar, DollarSign, Download, AlertTriangle,
  Trash2, FileDown, Utensils, Car, Clock, Briefcase as ServiceIcon, CheckCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { Header } from '../components/Header';
import { AdvanceForm } from '../components/AdvanceForm';
import { EmptyState } from '../components/EmptyState';
import { getTotalSalary, getPeriodSummary } from '../utils/salary';
import { PeriodBar } from '../components/PeriodBar';
import { formatPeriod } from '../utils/period';
import { formatBRL } from '../utils/currency';
import { generateAdvancePDF, generateCompleteReportPDF } from '../utils/pdfGenerator';
import { AdvanceRecord } from '../types';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEmployeeById, getEmployeeAdvances, addAdvance, deleteAdvance, markAdvanceDeducted, selectedPeriod, isPeriodClosed } = useApp();
  const { showToast } = useToast();

  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pdfDateModal, setPdfDateModal] = useState<{
    visible: boolean;
    advance: AdvanceRecord | null;
    date: string;
    time: string;
  }>({
    visible: false,
    advance: null,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  });

  const employee = getEmployeeById(id || '');
  const allAdvances = useMemo(
    () => (employee ? getEmployeeAdvances(employee.id).filter((a) => a.period === selectedPeriod) : []),
    [employee, getEmployeeAdvances, selectedPeriod]
  );
  const periodClosed = isPeriodClosed(selectedPeriod);

  const advances = useMemo(() => {
    return allAdvances.filter((adv) => {
      if (dateFrom && adv.date < dateFrom) return false;
      if (dateTo && adv.date > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [allAdvances, dateFrom, dateTo]);

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="Funcionário não encontrado" onBack={() => navigate('/')} showBackButton />
        <div className="container mx-auto px-4 py-12 text-center animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12">
            <EmptyState type="no-employees" onAction={() => navigate('/')} actionLabel="Voltar ao Início" />
          </div>
        </div>
      </div>
    );
  }

  const summary = getPeriodSummary(employee, allAdvances);
  const totalAdvances = summary.used;
  const totalSalary = getTotalSalary(employee);
  const remainingBalance = summary.remaining;
  const usagePercent = totalSalary > 0 ? (summary.manual / totalSalary) * 100 : 0;
  const canAdvance = !periodClosed && summary.maxAdvance > 0;
  const reportError = (e: unknown) => showToast(e instanceof Error ? e.message : String(e), 'error');

  const handleSaveAdvance = async (amount: number, notes: string | undefined, date: string, time: string) => {
    const dateTime = new Date(`${date}T${time}:00`).toISOString();
    try {
      await addAdvance(employee.id, { amount, notes, time, date: dateTime, period: date.slice(0, 7) });
      setShowAdvanceForm(false);
      showToast('Adiantamento registrado com sucesso!');
    } catch (e) {
      reportError(e);
      throw e;
    }
  };

  const handleDeleteAdvance = (advanceId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este adiantamento?')) {
      deleteAdvance(advanceId)
        .then(() => showToast('Adiantamento excluído.', 'warning'))
        .catch(reportError);
    }
  };

  const handleMarkDeducted = (advanceId: string) => {
    if (window.confirm('Marcar este adiantamento como descontado do salário?')) {
      markAdvanceDeducted(advanceId)
        .then(() => showToast('Adiantamento marcado como descontado.', 'info'))
        .catch(reportError);
    }
  };

  const handleOpenPDFDateModal = (advance: AdvanceRecord) => {
    setPdfDateModal({
      visible: true,
      advance,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const handleDownloadPDF = () => {
    if (pdfDateModal.advance) {
      const [year, month, day] = pdfDateModal.date.split('-');
      const customDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      generateAdvancePDF(pdfDateModal.advance, employee, totalAdvances, remainingBalance, customDate, pdfDateModal.time);
      setPdfDateModal({ visible: false, advance: null, date: '', time: '' });
      showToast('PDF gerado com sucesso!');
    }
  };

  const handleGenerateReport = () => {
    const filtered = dateFrom || dateTo
      ? advances
      : allAdvances;
    generateCompleteReportPDF(employee, filtered, totalAdvances, remainingBalance);
    showToast('Relatório PDF gerado!');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-enter">
      <Header title={`${employee.name} - Adiantamentos`} onBack={() => navigate('/')} showBackButton />

      <div className="container mx-auto px-4 py-6">
        <PeriodBar showAdminActions={false} />
        {/* Employee Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Informações do Funcionário</h2>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total em Adiantamentos ({formatPeriod(selectedPeriod)})</p>
              <p className="text-2xl font-bold text-red-600">{formatBRL(totalAdvances)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cargo</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">{employee.position}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Departamento</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">{employee.department}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Remuneração Total</p>
              <p className="font-bold text-blue-700 dark:text-blue-400">{formatBRL(totalSalary)}</p>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 mb-6">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center space-x-2">
              <DollarSign size={18} className="text-blue-600" />
              <span>Composição Salarial</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <SalaryItem icon={<DollarSign size={16} className="text-blue-600" />} label="Salário Base" value={employee.salary} />
              {employee.foodAllowance > 0 && <SalaryItem icon={<Utensils size={16} className="text-green-600" />} label="Vale Alimentação" value={employee.foodAllowance} />}
              {employee.transportAllowance > 0 && <SalaryItem icon={<Car size={16} className="text-purple-600" />} label="Vale Transporte" value={employee.transportAllowance} />}
              {employee.overtime > 0 && <SalaryItem icon={<Clock size={16} className="text-orange-600" />} label="Horas Extras" value={employee.overtime} />}
              {employee.services > 0 && <SalaryItem icon={<ServiceIcon size={16} className="text-indigo-600" />} label="Serviços Prestados" value={employee.services} />}
            </div>
          </div>

          {/* Balance */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 mb-6 border border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
                <DollarSign size={20} className="text-blue-600" />
                <span>Saldo Salarial</span>
              </h3>
              {remainingBalance < 0 && (
                <div className="flex items-center space-x-1 text-red-600 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-semibold">EXCEDIDO</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Remuneração Total</p>
                <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{formatBRL(totalSalary)}</p>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Adiantado</p>
                <p className="text-lg font-bold text-red-600">- {formatBRL(totalAdvances)}</p>
              </div>
              <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Restante</p>
                <p className={`text-xl font-bold ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatBRL(Math.abs(remainingBalance))}{remainingBalance < 0 && ' (NEGATIVO)'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-medium">Adiantamentos avulsos no mês (máx. 60%)</span>
                <span className="font-bold">{Math.min(100, usagePercent).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ease-out ${usagePercent < 40 ? 'bg-gradient-to-r from-green-400 to-green-500' : usagePercent < 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, usagePercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0%</span>
                <span className="text-yellow-600">40%</span>
                <span className="text-red-600 font-semibold">60% limite</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAdvanceForm(true)}
            disabled={!canAdvance}
            className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 transform ${
              canAdvance 
                ? 'btn-success' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus size={20} />
            <span>{periodClosed ? 'Competência fechada' : canAdvance ? `Inserir Valor (disponível ${formatBRL(summary.maxAdvance)})` : 'Saldo Esgotado'}</span>
          </button>
          {remainingBalance < 0 && (
            <div role="alert" className="flex items-start space-x-2 mt-3 p-3 rounded-lg border border-red-300 bg-red-50 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 text-sm">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <span>
                Atenção: em {formatPeriod(selectedPeriod)} os adiantamentos (avulsos {formatBRL(summary.manual)} + fixos {formatBRL(summary.fixed)}) passam da remuneração em {formatBRL(Math.abs(remainingBalance))}. Revise os lançamentos ou o valor da pensão.
              </span>
            </div>
          )}
          {summary.fixed > 0 && (
            <p className="text-xs text-purple-700 dark:text-purple-300 text-center mt-2">
              Adiantamentos fixos (pensão) no mês: {formatBRL(summary.fixed)} — não entram no limite de 60%.
            </p>
          )}
          {!periodClosed && !canAdvance && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center mt-2">
              O funcionário já atingiu o valor máximo permitido no mês (60% em avulsos ou remuneração esgotada)
            </p>
          )}
        </div>

        {/* Advances History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md animate-fade-in">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
                <FileText size={20} className="text-blue-600" />
                <span>Histórico de Adiantamentos ({advances.length})</span>
              </h3>
            </div>
            {/* Date Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Filtrar por período:</span>
              </div>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field !py-2 !px-3 text-sm !w-auto" />
              <span className="text-gray-400">até</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field !py-2 !px-3 text-sm !w-auto" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {advances.length === 0 ? (
              <EmptyState 
                type="no-advances" 
                onAction={() => setShowAdvanceForm(true)}
              />
            ) : (
              <div className="space-y-3">
                {advances.map((advance, index) => (
                  <div 
                    key={advance.id} 
                    className={`border rounded-xl p-4 transition-all duration-200 ${
                      advance.status === 'deducted' 
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 opacity-60' 
                        : 'border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-lg">
                              #{advances.length - index}
                            </span>
                            <DollarSign size={16} className="text-green-600" />
                            <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatBRL(advance.amount)}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                            <Calendar size={14} />
                            <span className="text-sm">{new Date(advance.date).toLocaleDateString('pt-BR')} às {advance.time}</span>
                          </div>
                          {advance.status === 'deducted' && (
                            <span className="flex items-center space-x-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full font-medium">
                              <CheckCircle size={12} />
                              <span>Descontado</span>
                            </span>
                          )}
                          {advance.source === 'fixed' && (
                            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2.5 py-1 rounded-full font-medium">
                              Fixo
                            </span>
                          )}
                          {advance.status === 'pending' && (
                            <span className="badge-warning">
                              Pendente
                            </span>
                          )}
                        </div>
                        {advance.notes && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mt-2">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              <strong className="text-gray-700 dark:text-gray-200">Observações:</strong> {advance.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 ml-4">
                        {advance.status === 'pending' && !periodClosed && (
                          <button 
                            onClick={() => handleMarkDeducted(advance.id)} 
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-all duration-200 transform hover:scale-110" 
                            title="Marcar como descontado"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenPDFDateModal(advance)} 
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 transform hover:scale-110" 
                          title="Baixar PDF"
                        >
                          <Download size={18} />
                        </button>
                        {!periodClosed && <button 
                          onClick={() => handleDeleteAdvance(advance.id)} 
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 transform hover:scale-110" 
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {allAdvances.length > 0 && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <button 
                onClick={handleGenerateReport} 
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <FileDown size={24} />
                <span className="text-lg">Gerar Relatório Completo (PDF)</span>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                {dateFrom || dateTo ? 'Relatório incluirá apenas o período filtrado' : 'Inclui todas as informações e histórico completo'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showAdvanceForm && (
        <AdvanceForm employee={employee} currentAdvances={totalAdvances} maxAdvance={summary.maxAdvance} period={selectedPeriod} onSave={handleSaveAdvance} onCancel={() => setShowAdvanceForm(false)} />
      )}

      {pdfDateModal.visible && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-backdrop">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Configurar Data e Hora</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Defina a data e hora do recibo</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Data</label>
                <input type="date" value={pdfDateModal.date} onChange={(e) => setPdfDateModal({ ...pdfDateModal, date: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hora</label>
                <input type="time" value={pdfDateModal.time} onChange={(e) => setPdfDateModal({ ...pdfDateModal, time: e.target.value })} className="input-field" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button 
                onClick={() => setPdfDateModal({ visible: false, advance: null, date: '', time: '' })} 
                className="flex-1 btn-outline"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDownloadPDF} 
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Download size={18} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
      <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-semibold text-gray-800 dark:text-gray-100">{formatBRL(value)}</p>
      </div>
    </div>
  );
}
