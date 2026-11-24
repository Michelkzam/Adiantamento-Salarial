import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Search, TrendingDown, FileBarChart, LayoutGrid, List, Eye, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import { Header } from '../components/Header';
import { EmployeeForm } from '../components/EmployeeForm';
import { ImportExportButtons } from '../components/ImportExportButtons';
import { ReportFilterModal } from '../components/ReportFilterModal';
import { BarChart, PieChart } from '../components/Charts';
import { EmptyState } from '../components/EmptyState';
import { SkeletonStatCard, SkeletonTableRow } from '../components/Skeleton';
import { COMPANY } from '../config/company';
import { getTotalSalary, sumEmployeeAdvances } from '../utils/salary';
import { PeriodBar } from '../components/PeriodBar';
import { formatPeriod } from '../utils/period';
import { formatBRL } from '../utils/currency';
import { generateAllEmployeesReportPDF } from '../utils/pdfGenerator';
import { Employee, EmployeeInput, FixedDeductionInput } from '../types';

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    employees,
    advances: allAdvances,
    selectedPeriod,
    getEmployeeFixedDeductions,
    isLoading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    importData,
  } = useApp();
  const { showToast } = useToast();
  const advances = useMemo(
    () => allAdvances.filter((a) => a.period === selectedPeriod),
    [allAdvances, selectedPeriod]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [showReportFilter, setShowReportFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); setShowForm(true); setEditingEmployee(null); }
      if (e.key === 'Escape') { setShowForm(false); setShowReportFilter(false); setEditingEmployee(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRemainingBalance = employees.reduce((total, emp) => {
    return total + getTotalSalary(emp) - sumEmployeeAdvances(advances, emp.id);
  }, 0);

  const handleSave = async (data: EmployeeInput, fixed: FixedDeductionInput[]) => {
    try {
      const over = editingEmployee ? await updateEmployee(editingEmployee, data, fixed) : await addEmployee(data, fixed);
      if (over.length > 0) {
        showToast(
          `Salvo, mas atenção: em ${over.map(formatPeriod).join(', ')} os adiantamentos de ${data.name} (avulsos + fixos) passam da remuneração. O saldo ficará negativo.`,
          'warning',
        );
      } else {
        showToast(editingEmployee ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!');
      }
      setShowForm(false);
      setEditingEmployee(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este funcionário? O histórico de adiantamentos será preservado na auditoria.')) {
      try {
        await deleteEmployee(id);
        showToast('Funcionário excluído.', 'warning');
      } catch (e) {
        showToast(e instanceof Error ? e.message : String(e), 'error');
      }
    }
  };

  const handleEdit = (id: string) => {
    setEditingEmployee(id);
    setShowForm(true);
  };

  const handleGenerateReport = () => {
    if (employees.length === 0) {
      showToast('Não há funcionários cadastrados.', 'warning');
      return;
    }
    setShowReportFilter(true);
  };

  const handleGenerateSelectedReport = (selectedEmployees: Employee[]) => {
    generateAllEmployeesReportPDF(selectedEmployees, advances);
    setShowReportFilter(false);
    showToast('Relatório PDF gerado com sucesso!');
  };

  const pendingAdvances = advances.filter((a) => a.status === 'pending').length;
  const activeAdvances = advances.filter((a) => a.status === 'deducted').length;

  const chartDataByDepartment = useMemo(() => {
    const deptMap: Record<string, number> = {};
    employees.forEach((emp) => {
      const empAdvances = advances.filter((a) => a.employeeId === emp.id);
      const total = empAdvances.reduce((sum, a) => sum + a.amount, 0);
      if (total > 0) {
        deptMap[emp.department] = (deptMap[emp.department] || 0) + total;
      }
    });
    return Object.entries(deptMap)
      .map(([label, value]) => ({ label, value, color: 'bg-blue-500' }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [employees, advances]);

  const statusPieData = useMemo(() => {
    return [
      { label: 'Pendentes', value: pendingAdvances, color: '#f59e0b' },
      { label: 'Descontados', value: activeAdvances, color: '#10b981' },
    ].filter((s) => s.value > 0);
  }, [activeAdvances, pendingAdvances]);

  const editingData = editingEmployee
    ? employees.find((e) => e.id === editingEmployee)
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 page-enter">
      <Header title="Adiantamento Salarial" />

      <div className="container mx-auto px-4 py-6">
        <PeriodBar />
        {/* Company Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 animate-fade-in">
          <div className="flex items-center justify-center space-x-4">
            <img
              src={COMPANY.logoPath}
              alt={`Logo ${COMPANY.name}`}
              className="h-20 w-auto"
            />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {COMPANY.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {COMPANY.fullName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                CNPJ: {COMPANY.cnpj}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-slide-up">
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar funcionários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <Plus size={20} />
            <span>Novo Funcionário</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {isLoading ? (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard
                icon={<Users className="text-blue-600" size={24} />}
                iconBg="bg-blue-100 dark:bg-blue-900"
                label="Total de Funcionários"
                value={employees.length.toString()}
              />
              <StatCard
                icon={<Plus className="text-green-600" size={24} />}
                iconBg="bg-green-100 dark:bg-green-900"
                label={`Adiantamentos (${formatPeriod(selectedPeriod)})`}
                value={advances.length.toString()}
              />
              <StatCard
                icon={<TrendingDown className="text-red-600" size={24} />}
                iconBg="bg-red-100 dark:bg-red-900"
                label="Total Adiantado no Mês"
                value={formatBRL(
                  advances.reduce((sum, adv) => sum + adv.amount, 0)
                )}
                valueClassName="text-red-600"
              />
              <StatCard
                icon={<span className="text-purple-600 font-bold">R$</span>}
                iconBg="bg-purple-100 dark:bg-purple-900"
                label="Saldo Restante Total"
                value={formatBRL(Math.abs(totalRemainingBalance))}
                valueClassName={
                  totalRemainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
                }
                suffix={
                  totalRemainingBalance < 0 ? (
                    <span className="text-xs block">NEGATIVO</span>
                  ) : undefined
                }
              />
            </>
          )}
        </div>

        {/* Charts */}
        {advances.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {chartDataByDepartment.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <BarChart data={chartDataByDepartment} title="Adiantamentos por Departamento" />
              </div>
            )}
            {statusPieData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Status dos Adiantamentos</h4>
                <PieChart segments={statusPieData} />
              </div>
            )}
          </div>
        )}

        {/* Import/Export */}
        <ImportExportButtons
          employees={employees}
          advances={allAdvances}
          onImportData={importData}
        />

        {/* Report Button */}
        <div className="mb-6">
          <button
            onClick={handleGenerateReport}
            disabled={employees.length === 0}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform ${
              employees.length > 0
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 hover:scale-[1.01] active:scale-[0.99] hover:shadow-xl'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <FileBarChart size={28} />
            <span>Gerar Relatório Completo de Todos os Funcionários (PDF)</span>
          </button>
          {employees.length === 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Cadastre funcionários para gerar o relatório completo
            </p>
          )}
        </div>

        {/* Employees */}
        {isLoading ? (
          <div className="space-y-4">
            <SkeletonTableRow />
            <SkeletonTableRow />
            <SkeletonTableRow />
            <SkeletonTableRow />
            <SkeletonTableRow />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <EmptyState
              type={employees.length === 0 ? 'no-employees' : 'no-results'}
              onAction={employees.length === 0 ? () => setShowForm(true) : () => setSearchTerm('')}
            />
          </div>
        ) : (
          <>
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Funcionários ({filteredEmployees.length})
              </h3>
              <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 shadow'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-blue-600 shadow'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <LayoutGrid size={18} />
                </button>
              </div>
            </div>

            {viewMode === 'table' ? (
              /* Table View */
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700 text-left">
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Nome</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Cargo</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Departamento</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Salário</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">V. Alimentação</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">V. Transporte</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">H. Extras</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Serviços</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Adiantamentos</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-right">Total</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-center">Status</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredEmployees
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((employee) => {
                          const totalSalary = getTotalSalary(employee);
                          const employeeAdvanceTotal = sumEmployeeAdvances(advances, employee.id);

                          return (
                            <tr
                              key={employee.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                              onClick={() => navigate(`/employee/${employee.id}`)}
                            >
                              <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                                {employee.name}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {employee.position}
                              </td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {employee.department}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-100">
                                {formatBRL(employee.salary)}
                              </td>
                              <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                                {employee.foodAllowance > 0 ? formatBRL(employee.foodAllowance) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400">
                                {employee.transportAllowance > 0 ? formatBRL(employee.transportAllowance) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                                {employee.overtime > 0 ? formatBRL(employee.overtime) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400">
                                {employee.services > 0 ? formatBRL(employee.services) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                                {employeeAdvanceTotal > 0 ? formatBRL(employeeAdvanceTotal) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                                {formatBRL(totalSalary)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  employee.isActive !== false
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                  {employee.isActive !== false ? 'Ativo' : 'Inativo'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    onClick={() => navigate(`/employee/${employee.id}`)}
                                    className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                    title="Ver detalhes"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(employee.id)}
                                    className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                                    title="Editar"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(employee.id)}
                                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-700 font-semibold text-gray-800 dark:text-gray-100">
                        <td className="px-4 py-3" colSpan={3}>Total Geral</td>
                        <td className="px-4 py-3 text-right">{formatBRL(filteredEmployees.reduce((sum, emp) => sum + emp.salary, 0))}</td>
                        <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{formatBRL(filteredEmployees.reduce((sum, emp) => sum + emp.foodAllowance, 0))}</td>
                        <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400">{formatBRL(filteredEmployees.reduce((sum, emp) => sum + emp.transportAllowance, 0))}</td>
                        <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">{formatBRL(filteredEmployees.reduce((sum, emp) => sum + emp.overtime, 0))}</td>
                        <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400">{formatBRL(filteredEmployees.reduce((sum, emp) => sum + emp.services, 0))}</td>
                        <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{formatBRL(filteredEmployees.reduce((sum, emp) => sum + sumEmployeeAdvances(advances, emp.id), 0))}</td>
                        <td className="px-4 py-3 text-right">{formatBRL(filteredEmployees.reduce((sum, emp) => sum + getTotalSalary(emp), 0))}</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((employee) => {
                    const totalSalary = getTotalSalary(employee);
                    const employeeAdvanceTotal = sumEmployeeAdvances(advances, employee.id);

                    return (
                      <div
                        key={employee.id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate(`/employee/${employee.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {employee.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {employee.position} — {employee.department}
                            </p>
                          </div>
                          <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                            employee.isActive !== false
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {employee.isActive !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-sm mb-3">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Salário:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-100">{formatBRL(employee.salary)}</span>
                          </div>
                          {employee.foodAllowance > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">V. Alimentação:</span>
                              <span className="text-green-600 dark:text-green-400">{formatBRL(employee.foodAllowance)}</span>
                            </div>
                          )}
                          {employee.transportAllowance > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">V. Transporte:</span>
                              <span className="text-purple-600 dark:text-purple-400">{formatBRL(employee.transportAllowance)}</span>
                            </div>
                          )}
                          {employee.overtime > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">H. Extras:</span>
                              <span className="text-orange-600 dark:text-orange-400">{formatBRL(employee.overtime)}</span>
                            </div>
                          )}
                          {employee.services > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Serviços:</span>
                              <span className="text-indigo-600 dark:text-indigo-400">{formatBRL(employee.services)}</span>
                            </div>
                          )}
                          {employeeAdvanceTotal > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Adiantamentos:</span>
                              <span className="text-red-600 dark:text-red-400">{formatBRL(employeeAdvanceTotal)}</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Remuneração Total</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatBRL(totalSalary)}</p>
                          </div>
                          <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => navigate(`/employee/${employee.id}`)}
                              className="p-2 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEdit(employee.id)}
                              className="p-2 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(employee.id)}
                              className="p-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingData}
          fixedDeductions={editingData ? getEmployeeFixedDeductions(editingData.id) : []}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingEmployee(null);
          }}
        />
      )}

      {showReportFilter && (
        <ReportFilterModal
          employees={employees}
          onGenerate={handleGenerateSelectedReport}
          onCancel={() => setShowReportFilter(false)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  valueClassName = 'text-gray-800 dark:text-gray-100',
  suffix,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  valueClassName?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 animate-fade-in">
      <div className="flex items-center space-x-4">
        <div
          className={`w-14 h-14 ${iconBg} rounded-xl flex items-center justify-center shadow-sm`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className={`text-2xl font-bold ${valueClassName}`}>{value}</p>
          {suffix}
        </div>
      </div>
    </div>
  );
}
