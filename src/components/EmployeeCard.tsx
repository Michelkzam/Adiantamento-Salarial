import React from 'react';
import { User, Briefcase, Building, DollarSign, CreditCard as Edit, Trash2, AlertTriangle, FileText, Utensils, Car, Clock, Briefcase as ServiceIcon } from 'lucide-react';
import { Employee } from '../types';
import { getTotalSalary } from '../utils/salary';
import { formatBRL } from '../utils/currency';

interface EmployeeCardProps {
  employee: Employee;
  totalAdvanced: number;
  remainingBalance: number;
  advancesCount: number;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: (employeeId: string) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  totalAdvanced,
  remainingBalance,
  advancesCount,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const totalSalary = getTotalSalary(employee);
  const usagePercent = totalSalary > 0 ? (totalAdvanced / totalSalary) * 100 : 0;
  const isActive = employee.isActive ?? true;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border ${
      isActive ? 'border-gray-100 dark:border-gray-700' : 'border-red-200 bg-red-50 dark:bg-red-900/20'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isActive ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
            }`}>
              <User className="text-white" size={24} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{employee.name}</h3>
                {!isActive && (
                  <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded">
                    INATIVO
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">ID: {employee.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors duration-200"
              title="Editar funcionário"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(employee.id); }}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
              title="Excluir funcionário"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <InfoRow icon={<Briefcase size={16} />} text={employee.position} />
          <InfoRow icon={<Building size={16} />} text={employee.department} />
          <InfoRow icon={<DollarSign size={16} />} text={formatBRL(employee.salary)} className="font-medium" />
          {employee.foodAllowance > 0 && (
            <InfoRow icon={<Utensils size={16} />} text={formatBRL(employee.foodAllowance)} className="text-green-600" />
          )}
          {employee.transportAllowance > 0 && (
            <InfoRow icon={<Car size={16} />} text={formatBRL(employee.transportAllowance)} className="text-purple-600" />
          )}
          {employee.overtime > 0 && (
            <InfoRow icon={<Clock size={16} />} text={formatBRL(employee.overtime)} className="text-orange-600" />
          )}
          {employee.services > 0 && (
            <InfoRow icon={<ServiceIcon size={16} />} text={formatBRL(employee.services)} className="text-indigo-600" />
          )}
          <InfoRow
            icon={<FileText size={16} />}
            text={`${advancesCount} adiantamento${advancesCount !== 1 ? 's' : ''}`}
          />
        </div>

        {/* Total Salary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Remuneração Total</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatBRL(totalSalary)}</p>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Situação Salarial</span>
            {remainingBalance < 0 && (
              <div className="flex items-center space-x-1">
                <AlertTriangle size={12} className="text-red-500" />
                <span className="text-xs text-red-600 font-medium">EXCEDIDO</span>
              </div>
            )}
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Adiantado:</span>
              <span className="text-red-600 font-medium">{formatBRL(totalAdvanced)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Saldo:</span>
              <span className={`font-bold ${remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatBRL(Math.abs(remainingBalance))}
                {remainingBalance < 0 && ' (NEG)'}
              </span>
            </div>
          </div>

          {/* Progress Bar - CORRIGIDO */}
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  usagePercent < 60
                    ? 'bg-green-500'
                    : usagePercent < 90
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, usagePercent))}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={onSelect}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105"
        >
          Gerenciar Adiantamentos
        </button>
      </div>
    </div>
  );
};

function InfoRow({ icon, text, className = '' }: { icon: React.ReactNode; text: string; className?: string }) {
  return (
    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
      {icon}
      <span className={`text-sm ${className}`}>{text}</span>
    </div>
  );
}
