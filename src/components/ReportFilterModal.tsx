import React, { useState, useMemo } from 'react';
import { X, FileBarChart, CheckSquare, Square, Building2, Users } from 'lucide-react';
import { Employee } from '../types';

interface ReportFilterModalProps {
  employees: Employee[];
  onGenerate: (selectedEmployees: Employee[]) => void;
  onCancel: () => void;
}

export const ReportFilterModal: React.FC<ReportFilterModalProps> = ({
  employees,
  onGenerate,
  onCancel,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(employees.map((e) => e.id))
  );
  const [activeTab, setActiveTab] = useState<'all' | 'department'>('all');

  const departments = useMemo(() => {
    const map = new Map<string, Employee[]>();
    employees.forEach((emp) => {
      const dept = emp.department;
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(emp);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [employees]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDepartment = (dept: string) => {
    const deptEmployees = departments.find(([name]) => name === dept)?.[1] || [];
    const allSelected = deptEmployees.every((e) => selectedIds.has(e.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      deptEmployees.forEach((e) => {
        if (allSelected) next.delete(e.id);
        else next.add(e.id);
      });
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(employees.map((e) => e.id)));
  const selectNone = () => setSelectedIds(new Set());

  const selectedEmployees = employees.filter((e) => selectedIds.has(e.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <FileBarChart className="text-purple-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Gerar Relatório
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users size={16} className="inline mr-1" />
            Por Funcionário
          </button>
          <button
            onClick={() => setActiveTab('department')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'department'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Building2 size={16} className="inline mr-1" />
            Por Departamento
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-700/50">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.size} de {employees.length} selecionados
          </span>
          <div className="space-x-2">
            <button
              onClick={selectAll}
              className="text-xs px-3 py-1 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            >
              Todos
            </button>
            <button
              onClick={selectNone}
              className="text-xs px-3 py-1 rounded-md bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              Nenhum
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {activeTab === 'all' &&
            employees
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  {selectedIds.has(employee.id) ? (
                    <CheckSquare size={20} className="text-purple-600 flex-shrink-0" />
                  ) : (
                    <Square size={20} className="text-gray-400 flex-shrink-0" />
                  )}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(employee.id)}
                    onChange={() => toggleEmployee(employee.id)}
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {employee.position} — {employee.department}
                    </p>
                  </div>
                </label>
              ))}

          {activeTab === 'department' &&
            departments.map(([dept, deptEmployees]) => {
              const allSelected = deptEmployees.every((e) => selectedIds.has(e.id));
              const someSelected = deptEmployees.some((e) => selectedIds.has(e.id));

              return (
                <div
                  key={dept}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                >
                  <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    {allSelected ? (
                      <CheckSquare size={20} className="text-purple-600 flex-shrink-0" />
                    ) : someSelected ? (
                      <div className="w-5 h-5 flex-shrink-0 bg-purple-600 rounded flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-white rounded" />
                      </div>
                    ) : (
                      <Square size={20} className="text-gray-400 flex-shrink-0" />
                    )}
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleDepartment(dept)}
                      className="sr-only"
                    />
                    <Building2 size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {dept}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                      {deptEmployees.length} funcionário(s)
                    </span>
                  </label>
                  <div className="px-3 pb-2 space-y-1">
                    {deptEmployees
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((employee) => (
                        <label
                          key={employee.id}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        >
                          {selectedIds.has(employee.id) ? (
                            <CheckSquare size={16} className="text-purple-500 flex-shrink-0" />
                          ) : (
                            <Square size={16} className="text-gray-400 flex-shrink-0" />
                          )}
                          <input
                            type="checkbox"
                            checked={selectedIds.has(employee.id)}
                            onChange={() => toggleEmployee(employee.id)}
                            className="sr-only"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {employee.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                            {employee.position}
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={() => onGenerate(selectedEmployees)}
              disabled={selectedEmployees.length === 0}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                selectedEmployees.length > 0
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FileBarChart size={18} />
              <span>Gerar Relatório ({selectedEmployees.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
