import * as XLSX from 'xlsx';
import { periodOf } from './period';
import { Employee, AdvanceRecord } from '../types';
import { getTotalSalary } from './salary';

// Função para exportar dados para Excel
export const exportToExcel = (employees: Employee[], advances: AdvanceRecord[]) => {
  // Criar workbook
  const workbook = XLSX.utils.book_new();
  
  // Preparar dados dos funcionários para Excel
  const employeesData = employees.map(employee => {
    const totalSalary = getTotalSalary(employee);
    
    const employeeAdvances = advances.filter(advance => advance.employeeId === employee.id);
    const totalAdvanced = employeeAdvances.reduce((sum, advance) => sum + advance.amount, 0);
    const remainingBalance = totalSalary - totalAdvanced;
    
    return {
      'ID': employee.id,
      'Nome Completo': employee.name,
      'Cargo': employee.position,
      'Departamento': employee.department,
      'Salário Base (R$)': employee.salary,
      'Vale Alimentação (R$)': employee.foodAllowance || 0,
      'Vale Transporte (R$)': employee.transportAllowance || 0,
      'Horas Extras (R$)': employee.overtime || 0,
      'Serviços Prestados (R$)': employee.services || 0,
      'Remuneração Total (R$)': totalSalary,
      'Total Adiantado (R$)': totalAdvanced,
      'Saldo Restante (R$)': remainingBalance,
      'Qtd. Adiantamentos': employeeAdvances.length,
      'Data de Cadastro': new Date(employee.createdAt).toLocaleDateString('pt-BR'),
      'Status': remainingBalance >= 0 ? 'Regular' : 'Saldo Negativo',
      'Situação': employee.isActive === false ? 'Inativo' : 'Ativo'
    };
  });
  
  // Preparar dados dos adiantamentos para Excel
  const advancesData = advances.map(advance => {
    const employee = employees.find(emp => emp.id === advance.employeeId);
    return {
      'ID Adiantamento': advance.id,
      'ID Funcionário': advance.employeeId,
      'Nome Funcionário': advance.employeeName,
      'Cargo': employee?.position || 'N/A',
      'Departamento': employee?.department || 'N/A',
      'Valor (R$)': advance.amount,
      'Data': new Date(advance.date).toLocaleDateString('pt-BR'),
      'Horário': advance.time,
      'Observações': advance.notes || '',
      'Competência': advance.period,
      'Tipo': advance.source === 'fixed' ? 'Fixo' : 'Avulso',
      'Status': advance.status === 'deducted' ? 'Descontado' : 'Pendente',
      'Mês/Ano': new Date(advance.date).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
    };
  });
  
  // Criar resumo geral
  const totalSalaries = employees.reduce((sum, emp) => sum + getTotalSalary(emp), 0);
  
  const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
  const totalRemaining = totalSalaries - totalAdvances;
  
  const summaryData = [
    { 'Indicador': 'Total de Funcionários', 'Valor': employees.length, 'Observação': 'Funcionários cadastrados no sistema' },
    { 'Indicador': 'Total de Adiantamentos', 'Valor': advances.length, 'Observação': 'Adiantamentos registrados' },
    { 'Indicador': 'Soma das Remunerações (R$)', 'Valor': totalSalaries, 'Observação': 'Soma de todas as remunerações mensais' },
    { 'Indicador': 'Total Adiantado (R$)', 'Valor': totalAdvances, 'Observação': 'Valor total pago em adiantamentos' },
    { 'Indicador': 'Saldo Total (R$)', 'Valor': totalRemaining, 'Observação': totalRemaining >= 0 ? 'Saldo disponível' : 'Valor a regularizar' },
    { 'Indicador': 'Percentual Utilizado (%)', 'Valor': ((totalAdvances / totalSalaries) * 100).toFixed(2), 'Observação': 'Percentual das remunerações utilizado' },
    { 'Indicador': 'Data da Exportação', 'Valor': new Date().toLocaleString('pt-BR'), 'Observação': 'Data e hora da geração do backup' }
  ];
  
  // Análise por departamento
  const departmentAnalysis = employees.reduce((acc, employee) => {
    const dept = employee.department;
    if (!acc[dept]) {
      acc[dept] = { 
        funcionarios: 0, 
        remuneracaoTotal: 0, 
        adiantamentosTotal: 0,
        qtdAdiantamentos: 0
      };
    }
    
    const totalSalary = getTotalSalary(employee);
    const employeeAdvances = advances.filter(advance => advance.employeeId === employee.id);
    const totalAdvanced = employeeAdvances.reduce((sum, advance) => sum + advance.amount, 0);
    
    acc[dept].funcionarios++;
    acc[dept].remuneracaoTotal += totalSalary;
    acc[dept].adiantamentosTotal += totalAdvanced;
    acc[dept].qtdAdiantamentos += employeeAdvances.length;
    
    return acc;
  }, {} as Record<string, { funcionarios: number; remuneracaoTotal: number; adiantamentosTotal: number; qtdAdiantamentos: number }>);
  
  const departmentData = Object.entries(departmentAnalysis).map(([dept, data]) => ({
    'Departamento': dept,
    'Funcionários': data.funcionarios,
    'Remuneração Total (R$)': data.remuneracaoTotal,
    'Adiantamentos Total (R$)': data.adiantamentosTotal,
    'Qtd. Adiantamentos': data.qtdAdiantamentos,
    'Percentual Utilizado (%)': ((data.adiantamentosTotal / data.remuneracaoTotal) * 100).toFixed(2),
    'Saldo Departamento (R$)': data.remuneracaoTotal - data.adiantamentosTotal
  }));
  
  // Criar planilhas
  const employeesSheet = XLSX.utils.json_to_sheet(employeesData);
  const advancesSheet = XLSX.utils.json_to_sheet(advancesData);
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  const departmentSheet = XLSX.utils.json_to_sheet(departmentData);
  
  // Configurar largura das colunas
  const employeesColWidths = [
    { wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, 
    { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 15 }
  ];
  
  const advancesColWidths = [
    { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 30 }, { wch: 10 }
  ];
  
  employeesSheet['!cols'] = employeesColWidths;
  advancesSheet['!cols'] = advancesColWidths;
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 40 }];
  departmentSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
  
  // Adicionar planilhas ao workbook
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Geral');
  XLSX.utils.book_append_sheet(workbook, employeesSheet, 'Funcionários');
  XLSX.utils.book_append_sheet(workbook, advancesSheet, 'Adiantamentos');
  XLSX.utils.book_append_sheet(workbook, departmentSheet, 'Por Departamento');
  
  // Gerar e baixar arquivo
  const fileName = `backup_adiantamentos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}_${new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  
  return fileName;
};

type SheetRow = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (v == null || v === '' ? fallback : String(v));
const num = (v: unknown): number => {
  if (typeof v === 'number') return v;
  const n = parseFloat(str(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const brDate = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString();
  const text = str(v);
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12).toISOString();
  const d = text ? new Date(text) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

// Função para importar dados do Excel
export const importFromExcel = (file: File): Promise<{ employees: Employee[], advances: AdvanceRecord[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        let employees: Employee[] = [];
        let advances: AdvanceRecord[] = [];

        if (workbook.SheetNames.includes('Funcionários')) {
          const rows = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets['Funcionários']);
          employees = rows.map((row) => ({
            id: str(row['ID']) || crypto.randomUUID(),
            name: str(row['Nome Completo']),
            position: str(row['Cargo']),
            department: str(row['Departamento']),
            salary: num(row['Salário Base (R$)']),
            foodAllowance: num(row['Vale Alimentação (R$)']),
            transportAllowance: num(row['Vale Transporte (R$)']),
            overtime: num(row['Horas Extras (R$)']),
            services: num(row['Serviços Prestados (R$)']),
            isActive: str(row['Situação']).toLowerCase() !== 'inativo',
            createdAt: brDate(row['Data de Cadastro']),
          }));
        }

        if (workbook.SheetNames.includes('Adiantamentos')) {
          const rows = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets['Adiantamentos']);
          advances = rows
            .filter((row) => str(row['Tipo']) !== 'Fixo')
            .map((row) => {
              const date = brDate(row['Data']);
              return {
                id: str(row['ID Adiantamento']) || crypto.randomUUID(),
                employeeId: str(row['ID Funcionário']),
                employeeName: str(row['Nome Funcionário']),
                amount: num(row['Valor (R$)']),
                date,
                time: str(row['Horário'], '00:00'),
                notes: str(row['Observações']) || undefined,
                status: str(row['Status']) === 'Descontado' ? 'deducted' : 'pending',
                period: /^\d{4}-\d{2}$/.test(str(row['Competência'])) ? str(row['Competência']) : periodOf(date),
                source: 'manual',
              };
            });
        }

        resolve({ employees, advances });
      } catch {
        reject(new Error('Erro ao processar arquivo Excel. Verifique se o formato está correto.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo.'));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Função para validar dados importados
export const validateImportedData = (employees: Employee[], advances: AdvanceRecord[]) => {
  const errors: string[] = [];
  
  // Validar funcionários
  employees.forEach((employee, index) => {
    if (!employee.name.trim()) {
      errors.push(`Funcionário na linha ${index + 2}: Nome é obrigatório`);
    }
    if (!employee.position.trim()) {
      errors.push(`Funcionário na linha ${index + 2}: Cargo é obrigatório`);
    }
    if (!employee.department.trim()) {
      errors.push(`Funcionário na linha ${index + 2}: Departamento é obrigatório`);
    }
    if (employee.salary <= 0) {
      errors.push(`Funcionário na linha ${index + 2}: Salário deve ser maior que zero`);
    }
  });
  
  // Validar adiantamentos
  advances.forEach((advance, index) => {
    if (!advance.employeeId.trim()) {
      errors.push(`Adiantamento na linha ${index + 2}: ID do funcionário é obrigatório`);
    }
    if (!advance.employeeName.trim()) {
      errors.push(`Adiantamento na linha ${index + 2}: Nome do funcionário é obrigatório`);
    }
    if (advance.amount <= 0) {
      errors.push(`Adiantamento na linha ${index + 2}: Valor deve ser maior que zero`);
    }
    
    // Verificar se o funcionário existe
    const employeeExists = employees.some(emp => emp.id === advance.employeeId);
    if (!employeeExists) {
      errors.push(`Adiantamento na linha ${index + 2}: Funcionário com ID ${advance.employeeId} não encontrado`);
    }
  });
  
  return errors;
};

// Função para gerar template Excel para importação
export const generateImportTemplate = () => {
  const workbook = XLSX.utils.book_new();
  
  // Template de funcionários
  const employeesTemplate = [
    {
      'ID': 'Deixe em branco para novos funcionários',
      'Nome Completo': 'João da Silva',
      'Cargo': 'Analista',
      'Departamento': 'Financeiro',
      'Salário Base (R$)': 3000,
      'Vale Alimentação (R$)': 500,
      'Vale Transporte (R$)': 200,
      'Horas Extras (R$)': 300,
      'Serviços Prestados (R$)': 0,
      'Data de Cadastro': new Date().toLocaleDateString('pt-BR')
    }
  ];
  
  // Template de adiantamentos
  const advancesTemplate = [
    {
      'ID Adiantamento': 'Deixe em branco para novos adiantamentos',
      'ID Funcionário': 'ID do funcionário (deve existir na planilha Funcionários)',
      'Nome Funcionário': 'João da Silva',
      'Valor (R$)': 500,
      'Data': new Date().toLocaleDateString('pt-BR'),
      'Horário': '14:30',
      'Observações': 'Adiantamento para despesas médicas'
    }
  ];
  
  // Instruções
  const instructions = [
    { 'Instruções de Importação': 'LEIA ATENTAMENTE ANTES DE IMPORTAR' },
    { 'Instruções de Importação': '' },
    { 'Instruções de Importação': '1. Mantenha os nomes das colunas exatamente como estão' },
    { 'Instruções de Importação': '2. Para novos registros, deixe a coluna ID em branco' },
    { 'Instruções de Importação': '3. Datas devem estar no formato DD/MM/AAAA' },
    { 'Instruções de Importação': '4. Valores monetários devem ser números (sem R$ ou pontos)' },
    { 'Instruções de Importação': '5. Horários no formato HH:MM' },
    { 'Instruções de Importação': '6. Todos os campos obrigatórios devem ser preenchidos' },
    { 'Instruções de Importação': '7. IDs de funcionários nos adiantamentos devem existir' },
    { 'Instruções de Importação': '8. Remova as linhas de exemplo antes de importar' },
    { 'Instruções de Importação': '' },
    { 'Instruções de Importação': 'Campos Obrigatórios:' },
    { 'Instruções de Importação': '- Funcionários: Nome, Cargo, Departamento, Salário Base' },
    { 'Instruções de Importação': '- Adiantamentos: ID Funcionário, Nome, Valor, Data' }
  ];
  
  const employeesSheet = XLSX.utils.json_to_sheet(employeesTemplate);
  const advancesSheet = XLSX.utils.json_to_sheet(advancesTemplate);
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'INSTRUÇÕES');
  XLSX.utils.book_append_sheet(workbook, employeesSheet, 'Funcionários');
  XLSX.utils.book_append_sheet(workbook, advancesSheet, 'Adiantamentos');
  
  const fileName = `template_importacao_adiantamentos.xlsx`;
  XLSX.writeFile(workbook, fileName);
  
  return fileName;
};