import React, { useState, useEffect, useRef } from 'react';
import { X, Save, User } from 'lucide-react';
import { Employee, EmployeeInput } from '../types';
import { formatBRL } from '../utils/currency';

interface EmployeeFormProps {
  employee?: Employee;
  onSave: (data: EmployeeInput) => void;
  onCancel: () => void;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    department: '',
    salary: '',
    foodAllowance: '',
    transportAllowance: '',
    overtime: '',
    services: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        position: employee.position,
        department: employee.department,
        salary: employee.salary.toString(),
        foodAllowance: employee.foodAllowance?.toString() || '0',
        transportAllowance: employee.transportAllowance?.toString() || '0',
        overtime: employee.overtime?.toString() || '0',
        services: employee.services?.toString() || '0',
        isActive: employee.isActive ?? true,
      });
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (formData.name && formData.position && formData.department && formData.salary) {
      submittingRef.current = true;
      setIsSubmitting(true);
      onSave({
        name: formData.name.trim(),
        position: formData.position.trim(),
        department: formData.department.trim(),
        salary: parseFloat(formData.salary),
        foodAllowance: parseFloat(formData.foodAllowance) || 0,
        transportAllowance: parseFloat(formData.transportAllowance) || 0,
        overtime: parseFloat(formData.overtime) || 0,
        services: parseFloat(formData.services) || 0,
        isActive: formData.isActive,
      });
    }
  };

  const totalSalary =
    (parseFloat(formData.salary) || 0) +
    (parseFloat(formData.foodAllowance) || 0) +
    (parseFloat(formData.transportAllowance) || 0) +
    (parseFloat(formData.overtime) || 0) +
    (parseFloat(formData.services) || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <User className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {employee ? 'Editar Funcionário' : 'Novo Funcionário'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <InputField
            label="Nome Completo"
            value={formData.name}
            onChange={(v) => setFormData({ ...formData, name: v })}
            placeholder="Digite o nome completo"
            required
          />
          <InputField
            label="Cargo"
            value={formData.position}
            onChange={(v) => setFormData({ ...formData, position: v })}
            placeholder="Digite o cargo"
            required
          />
          <InputField
            label="Departamento"
            value={formData.department}
            onChange={(v) => setFormData({ ...formData, department: v })}
            placeholder="Digite o departamento"
            required
          />

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Funcionário Ativo
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Desmarque para desativar o funcionário</p>
              </div>
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Componentes Salariais</p>
            <NumberField
              label="Salário Base (R$)"
              value={formData.salary}
              onChange={(v) => setFormData({ ...formData, salary: v })}
              required
              color="blue"
            />
            <NumberField
              label="Vale Alimentação (R$)"
              value={formData.foodAllowance}
              onChange={(v) => setFormData({ ...formData, foodAllowance: v })}
              color="green"
            />
            <NumberField
              label="Vale Transporte (R$)"
              value={formData.transportAllowance}
              onChange={(v) => setFormData({ ...formData, transportAllowance: v })}
              color="purple"
            />
            <NumberField
              label="Horas Extras (R$)"
              value={formData.overtime}
              onChange={(v) => setFormData({ ...formData, overtime: v })}
              color="orange"
            />
            <NumberField
              label="Serviços Prestados (R$)"
              value={formData.services}
              onChange={(v) => setFormData({ ...formData, services: v })}
              color="indigo"
            />
          </div>

          {totalSalary > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Remuneração Total</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatBRL(totalSalary)}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                  <BreakdownRow label="Salário Base" value={parseFloat(formData.salary) || 0} />
                  <BreakdownRow label="Vale Alimentação" value={parseFloat(formData.foodAllowance) || 0} />
                  <BreakdownRow label="Vale Transporte" value={parseFloat(formData.transportAllowance) || 0} />
                  <BreakdownRow label="Horas Extras" value={parseFloat(formData.overtime) || 0} />
                  <BreakdownRow label="Serviços Prestados" value={parseFloat(formData.services) || 0} />
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.position || !formData.department || !formData.salary}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Save size={18} />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function InputField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  required = false,
  color = 'blue',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'focus:ring-blue-500 focus:border-blue-500',
    green: 'focus:ring-green-500 focus:border-green-500',
    purple: 'focus:ring-purple-500 focus:border-purple-500',
    orange: 'focus:ring-orange-500 focus:border-orange-500',
    indigo: 'focus:ring-indigo-500 focus:border-indigo-500',
  };

  const ringClass = colorClasses[color] || colorClasses.blue;

  const handleChange = (raw: string) => {
    const normalized = raw.replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    if (parts.length > 2) return;
    onChange(normalized);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 ${ringClass} focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
        placeholder="0,00"
        required={required}
      />
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      <span className="font-medium">{formatBRL(value)}</span>
    </div>
  );
}
