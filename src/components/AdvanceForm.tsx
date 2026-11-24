import React, { useState, useRef } from 'react';
import { X, Save, DollarSign, Calendar, Clock, FileText, AlertTriangle, Utensils, Car, Briefcase as ServiceIcon } from 'lucide-react';
import { Employee } from '../types';
import { getTotalSalary } from '../utils/salary';
import { formatBRL } from '../utils/currency';

interface AdvanceFormProps {
  employee: Employee;
  currentAdvances: number;
  onSave: (amount: number, notes: string | undefined, date: string, time: string) => Promise<void>;
  onCancel: () => void;
}

export const AdvanceForm: React.FC<AdvanceFormProps> = ({
  employee,
  currentAdvances,
  onSave,
  onCancel,
}) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  });
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const totalSalary = getTotalSalary(employee);
  const remainingBalance = totalSalary - currentAdvances;
  const maxAdvance = Math.min(totalSalary * 0.6, remainingBalance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const advanceAmount = parseFloat(amount);
      if (amount && advanceAmount > 0 && advanceAmount <= maxAdvance && date && time) {
        await onSave(advanceAmount, notes || undefined, date, time);
      }
    } catch {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (raw: string) => {
    const normalized = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    if (parts.length > 2) return;
    setAmount(normalized);
  };

  const currentAmount = parseFloat(amount) || 0;
  const newBalance = remainingBalance - currentAmount;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-backdrop">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Novo Adiantamento
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">{employee.name}</h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">{employee.position} - {employee.department}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Remuneração Total: {formatBRL(totalSalary)}
            </p>
          </div>

          {/* Salary Breakdown */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Composição Salarial</h4>
            <div className="space-y-2 text-sm">
              <SalaryRow icon={<DollarSign size={14} className="text-blue-600" />} label="Salário Base:" value={employee.salary} />
              {employee.foodAllowance > 0 && (
                <SalaryRow icon={<Utensils size={14} className="text-green-600" />} label="Vale Alimentação:" value={employee.foodAllowance} />
              )}
              {employee.transportAllowance > 0 && (
                <SalaryRow icon={<Car size={14} className="text-purple-600" />} label="Vale Transporte:" value={employee.transportAllowance} />
              )}
              {employee.overtime > 0 && (
                <SalaryRow icon={<Clock size={14} className="text-orange-600" />} label="Horas Extras:" value={employee.overtime} />
              )}
              {employee.services > 0 && (
                <SalaryRow icon={<ServiceIcon size={14} className="text-indigo-600" />} label="Serviços Prestados:" value={employee.services} />
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Total:</span>
                <span className="font-bold text-blue-600">{formatBRL(totalSalary)}</span>
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Situação Salarial</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Remuneração Total:</span>
                <span className="font-medium">{formatBRL(totalSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Já Adiantado:</span>
                <span className="font-medium text-red-600">- {formatBRL(currentAdvances)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600 dark:text-gray-400">Saldo Disponível:</span>
                <span className="font-bold text-green-600">{formatBRL(remainingBalance)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valor do Adiantamento (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200"
                placeholder="0,00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor máximo disponível: {formatBRL(maxAdvance)}
              </p>

              {currentAmount > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    <strong>Novo saldo após este adiantamento:</strong> {formatBRL(newBalance)}
                  </p>
                </div>
              )}

              {currentAmount > maxAdvance && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700 flex items-center space-x-1">
                  <AlertTriangle size={14} className="text-red-600" />
                  <p className="text-xs text-red-800 dark:text-red-300">
                    Valor excede o limite disponível
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="advance-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar size={16} className="inline mr-1" />
                  Data
                </label>
                <input
                  id="advance-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 [color-scheme:light] dark:[color-scheme:dark]"
                  required
                />
              </div>
              <div>
                <label htmlFor="advance-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock size={16} className="inline mr-1" />
                  Horário
                </label>
                <input
                  id="advance-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 [color-scheme:light] dark:[color-scheme:dark]"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              Data e hora editáveis — informe o momento real do adiantamento, inclusive datas retroativas.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText size={16} className="inline mr-1" />
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200"
                placeholder="Digite observações sobre o adiantamento..."
                rows={3}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAdvance || !date || !time || isSubmitting}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                <span>{isSubmitting ? 'Salvando...' : 'Salvar e Gerar PDF'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

function SalaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {icon}
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className="font-medium">{formatBRL(value)}</span>
    </div>
  );
}
