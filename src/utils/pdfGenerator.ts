import jsPDF from 'jspdf';
import { AdvanceRecord, Employee } from '../types';
import { COMPANY } from '../config/company';
import { getTotalSalary } from '../utils/salary';
import { formatBRL, numberToWords } from '../utils/currency';
import logoPdf from '../assets/logo-amry-pdf.png?inline';

const formatDate = (date: Date): string =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatDateTime = (date: Date): string =>
  date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

function drawCompanyHeader(doc: jsPDF, yPos: number): number {
  const logoSize = 18;
  doc.addImage(logoPdf, 'PNG', 20, yPos - 2, logoSize, logoSize);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 98, 183);
  doc.text(COMPANY.name, 20 + logoSize + 4, yPos + 4);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${COMPANY.fullName} | CNPJ: ${COMPANY.cnpj}`, 20 + logoSize + 4, yPos + 9);
  return yPos + logoSize + 2;
}

function drawDecorativeLine(doc: jsPDF, yPos: number): number {
  doc.setLineWidth(0.8);
  doc.setDrawColor(41, 98, 183);
  doc.line(20, yPos, 190, yPos);
  doc.setDrawColor(0, 0, 0);
  return yPos + 8;
}

export const generateAdvancePDF = (
  record: AdvanceRecord,
  employee: Employee,
  _totalAdvances: number,
  _remainingBalance: number,
  customDate?: Date,
  customTime?: string
) => {
  const doc = new jsPDF();
  let yPos = 12;
  const issuanceDate = customDate || new Date();
  const issuanceTime = customTime || issuanceDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  doc.setFont('helvetica', 'normal');
  yPos = drawCompanyHeader(doc, yPos);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE ADIANTAMENTO SALARIAL', 105, yPos, { align: 'center' });
  yPos += 7;
  yPos = drawDecorativeLine(doc, yPos);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const receiptNumber = `AS-${record.id.slice(0, 8).toUpperCase()}`;
  doc.text(`Recibo No: ${receiptNumber}`, 20, yPos);
  doc.text(`Data: ${formatDate(issuanceDate)} | Horario: ${issuanceTime}`, 80, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DECLARACAO DE RECEBIMENTO', 20, yPos);
  yPos += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const declarationText = `Declaro ter recebido da ${COMPANY.fullName} (CNPJ ${COMPANY.cnpj}) o valor abaixo, referente a adiantamento salarial conforme autorizado em meu contrato de trabalho.`;
  const textLines = doc.splitTextToSize(declarationText, 170);
  textLines.forEach((line: string) => {
    doc.text(line, 20, yPos);
    yPos += 3.5;
  });
  yPos += 4;

  doc.setFillColor(240, 248, 255);
  doc.rect(20, yPos - 2, 170, 12, 'F');
  doc.setLineWidth(0.5);
  doc.rect(20, yPos - 2, 170, 12);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatBRL(record.amount), 105, yPos + 3, { align: 'center' });
  yPos += 14;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Valor por extenso: ${numberToWords(record.amount).toUpperCase()}`, 20, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO FUNCIONARIO', 20, yPos);
  yPos += 4;

  doc.setFillColor(248, 249, 250);
  doc.rect(20, yPos - 2, 170, 28, 'F');
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, yPos - 2, 170, 28);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const totalSalary = getTotalSalary(employee);

  doc.setFont('helvetica', 'bold');
  doc.text('Nome:', 25, yPos + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.name.toUpperCase(), 50, yPos + 3);

  doc.setFont('helvetica', 'bold');
  doc.text('Cargo:', 25, yPos + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.position, 50, yPos + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Depto:', 105, yPos + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(employee.department, 130, yPos + 3);

  doc.setFont('helvetica', 'bold');
  doc.text('Remuneracao:', 105, yPos + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(formatBRL(totalSalary), 130, yPos + 9);

  doc.setFont('helvetica', 'bold');
  doc.text('Data Cadastro:', 25, yPos + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(new Date(employee.createdAt)), 50, yPos + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Data Adiant.:', 105, yPos + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(new Date(record.date)), 130, yPos + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Horario:', 25, yPos + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(record.time, 50, yPos + 21);

  yPos += 33;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURA DO FUNCIONARIO:', 20, yPos);
  yPos += 6;

  doc.setLineWidth(1);
  doc.line(20, yPos + 15, 95, yPos + 15);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Funcionario', 25, yPos + 18);
  doc.text(employee.name.toUpperCase(), 25, yPos + 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Data: ${formatDate(issuanceDate)}`, 120, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Hora: ${issuanceTime}`, 120, yPos + 4);

  yPos += 30;

  doc.setLineWidth(0.5);
  doc.setDrawColor(41, 98, 183);
  doc.line(20, yPos, 190, yPos);

  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text(`Documento gerado em: ${formatDateTime(issuanceDate)} | Recibo: ${receiptNumber}`, 20, yPos + 3);
  doc.text('Sistema de Gestao de Adiantamentos Salariais', 20, yPos + 6);

  const fileName = `recibo_adiantamento_${employee.name.replace(/\s+/g, '_').toLowerCase()}_${formatDate(new Date(record.date)).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};

export const generateCompleteReportPDF = (
  employee: Employee,
  advances: AdvanceRecord[],
  totalAdvances: number,
  remainingBalance: number
) => {
  const doc = new jsPDF();
  let yPosition = drawCompanyHeader(doc, 14);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATORIO INDIVIDUAL DE ADIANTAMENTOS SALARIAIS', 105, yPosition, { align: 'center' });
  yPosition += 10;
  yPosition = drawDecorativeLine(doc, yPosition);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatorio gerado em: ${formatDateTime(new Date())}`, 20, yPosition);
  yPosition += 15;

  const totalSalary = getTotalSalary(employee);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DADOS DO FUNCIONARIO', 20, yPosition);
  yPosition += 10;

  doc.setLineWidth(0.3);
  doc.rect(20, yPosition - 5, 170, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Nome: ${employee.name.toUpperCase()}`, 25, yPosition + 5);
  doc.text(`Cargo/Funcao: ${employee.position}`, 25, yPosition + 15);
  doc.text(`Departamento: ${employee.department}`, 25, yPosition + 25);
  doc.text(`Data de Cadastro: ${formatDate(new Date(employee.createdAt))}`, 25, yPosition + 35);
  yPosition += 55;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. COMPOSICAO DA REMUNERACAO MENSAL', 20, yPosition);
  yPosition += 10;

  doc.setLineWidth(0.3);
  doc.rect(20, yPosition - 5, 170, 60);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRICAO', 25, yPosition + 5);
  doc.text('VALOR (R$)', 140, yPosition + 5);
  doc.line(20, yPosition + 8, 190, yPosition + 8);

  doc.setFont('helvetica', 'normal');
  let salaryY = yPosition + 15;

  doc.text('Salario Base', 25, salaryY);
  doc.text(formatBRL(employee.salary).replace('R$', '').trim(), 140, salaryY);
  salaryY += 8;

  if (employee.foodAllowance > 0) {
    doc.text('Vale Alimentacao', 25, salaryY);
    doc.text(formatBRL(employee.foodAllowance).replace('R$', '').trim(), 140, salaryY);
    salaryY += 8;
  }
  if (employee.transportAllowance > 0) {
    doc.text('Vale Transporte', 25, salaryY);
    doc.text(formatBRL(employee.transportAllowance).replace('R$', '').trim(), 140, salaryY);
    salaryY += 8;
  }
  if (employee.overtime > 0) {
    doc.text('Horas Extras', 25, salaryY);
    doc.text(formatBRL(employee.overtime).replace('R$', '').trim(), 140, salaryY);
    salaryY += 8;
  }
  if (employee.services > 0) {
    doc.text('Servicos Prestados', 25, salaryY);
    doc.text(formatBRL(employee.services).replace('R$', '').trim(), 140, salaryY);
    salaryY += 8;
  }

  doc.line(130, salaryY, 190, salaryY);
  salaryY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL MENSAL', 25, salaryY);
  doc.text(formatBRL(totalSalary).replace('R$', '').trim(), 140, salaryY);

  yPosition += 75;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. RESUMO FINANCEIRO', 20, yPosition);
  yPosition += 10;

  doc.setLineWidth(0.3);
  doc.rect(20, yPosition - 5, 170, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Remuneracao Mensal Total: ${formatBRL(totalSalary)}`, 25, yPosition + 8);
  doc.text(`Total de Adiantamentos: ${formatBRL(totalAdvances)}`, 25, yPosition + 18);
  doc.text(`Quantidade de Adiantamentos: ${advances.length}`, 25, yPosition + 28);

  doc.line(25, yPosition + 32, 165, yPosition + 32);
  doc.setFont('helvetica', 'bold');

  if (remainingBalance < 0) {
    doc.setTextColor(200, 0, 0);
    doc.text(`Valor a Descontar: ${formatBRL(Math.abs(remainingBalance))}`, 25, yPosition + 40);
  } else {
    doc.setTextColor(0, 128, 0);
    doc.text(`Saldo Disponivel: ${formatBRL(remainingBalance)}`, 25, yPosition + 40);
  }
  doc.setTextColor(0, 0, 0);
  yPosition += 60;

  const percentageUsed = totalSalary > 0 ? (totalAdvances / totalSalary) * 100 : 0;
  doc.setFont('helvetica', 'normal');
  doc.text(`Percentual da Remuneracao Utilizado: ${percentageUsed.toFixed(1)}%`, 25, yPosition);
  yPosition += 15;

  if (remainingBalance < 0) {
    doc.setFillColor(255, 240, 240);
    doc.rect(20, yPosition - 5, 170, 25, 'F');
    doc.setLineWidth(0.3);
    doc.rect(20, yPosition - 5, 170, 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(200, 0, 0);
    doc.text('ATENCAO: SITUACAO FINANCEIRA IRREGULAR', 25, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('O valor dos adiantamentos excede a remuneracao mensal. Este valor devera', 25, yPosition + 13);
    doc.text('ser regularizado atraves de desconto na proxima folha de pagamento.', 25, yPosition + 20);
    doc.setTextColor(0, 0, 0);
    yPosition += 35;
  }

  if (advances.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('4. HISTORICO DETALHADO DE ADIANTAMENTOS', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 25, yPosition);
    doc.text('DATA', 40, yPosition);
    doc.text('HORARIO', 70, yPosition);
    doc.text('VALOR (R$)', 100, yPosition);
    doc.text('OBSERVACOES', 140, yPosition);
    yPosition += 5;

    doc.setLineWidth(0.2);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 8;

    const sortedAdvances = [...advances].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    doc.setFont('helvetica', 'normal');
    sortedAdvances.forEach((advance, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('4. HISTORICO DETALHADO DE ADIANTAMENTOS (continuacao)', 20, yPosition);
        yPosition += 15;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('#', 25, yPosition);
        doc.text('DATA', 40, yPosition);
        doc.text('HORARIO', 70, yPosition);
        doc.text('VALOR (R$)', 100, yPosition);
        doc.text('OBSERVACOES', 140, yPosition);
        yPosition += 5;
        doc.setLineWidth(0.2);
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
      }

      const advanceNumber = advances.length - index;
      doc.text(advanceNumber.toString().padStart(2, '0'), 25, yPosition);
      doc.text(formatDate(new Date(advance.date)), 40, yPosition);
      doc.text(advance.time, 70, yPosition);
      doc.text(formatBRL(advance.amount).replace('R$', '').trim(), 100, yPosition);

      const notes = advance.notes || '-';
      doc.text(notes.length > 30 ? notes.substring(0, 27) + '...' : notes, 140, yPosition);
      yPosition += 8;

      if (index < sortedAdvances.length - 1) {
        doc.setLineWidth(0.1);
        doc.line(20, yPosition, 190, yPosition);
        yPosition += 3;
      }
    });
    yPosition += 15;
  }

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 30;
  }

  if (advances.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('5. ESTATISTICAS E ANALISES', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const averageAdvance = totalAdvances / advances.length;
    const firstAdvance = new Date(Math.min(...advances.map(a => new Date(a.date).getTime())));
    const lastAdvance = new Date(Math.max(...advances.map(a => new Date(a.date).getTime())));

    doc.text(`Valor Medio por Adiantamento: ${formatBRL(averageAdvance)}`, 25, yPosition);
    yPosition += 8;
    doc.text(`Primeiro Adiantamento: ${formatDate(firstAdvance)}`, 25, yPosition);
    yPosition += 8;
    doc.text(`Ultimo Adiantamento: ${formatDate(lastAdvance)}`, 25, yPosition);
    yPosition += 8;
    doc.text(`Frequencia Media: ${(advances.length / 12).toFixed(1)} adiantamentos por mes`, 25, yPosition);
    yPosition += 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ASSINATURAS:', 20, yPosition);
  yPosition += 15;

  doc.setLineWidth(0.3);
  doc.line(20, yPosition, 90, yPosition);
  doc.line(120, yPosition, 190, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Funcionario', 40, yPosition);
  doc.text('Responsavel/RH', 140, yPosition);
  yPosition += 5;

  doc.setFontSize(8);
  doc.text(employee.name.toUpperCase(), 20, yPosition);
  doc.text(`Data: ${formatDate(new Date())}`, 120, yPosition);
  yPosition += 15;

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Este relatorio foi gerado automaticamente pelo Sistema de Gestao de Adiantamentos Salariais.', 20, yPosition);
  yPosition += 4;
  doc.text(`Relatorio individual gerado em: ${formatDateTime(new Date())}`, 20, yPosition);
  yPosition += 4;
  doc.text(`Total de paginas: ${doc.getNumberOfPages()}`, 20, yPosition);

  const fileName = `relatorio_individual_${employee.name.replace(/\s+/g, '_').toLowerCase()}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};

export const generateAllEmployeesReportPDF = (
  employees: Employee[],
  advances: AdvanceRecord[]
) => {
  const doc = new jsPDF();
  let yPosition = drawCompanyHeader(doc, 14);

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATORIO GERAL DE ADIANTAMENTOS SALARIAIS', 105, yPosition, { align: 'center' });
  yPosition += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Demonstrativo Completo de Todos os Funcionarios', 105, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setLineWidth(1);
  doc.setDrawColor(41, 98, 183);
  doc.line(20, yPosition, 190, yPosition);
  doc.setDrawColor(0, 0, 0);
  yPosition += 15;

  doc.setFontSize(10);
  doc.text(`Relatorio gerado em: ${formatDateTime(new Date())}`, 20, yPosition);
  doc.text(`Periodo de analise: Todos os registros`, 120, yPosition);
  yPosition += 6;
  doc.text(`Total de funcionarios analisados: ${employees.length}`, 20, yPosition);
  doc.text(`Total de adiantamentos registrados: ${advances.length}`, 120, yPosition);
  yPosition += 20;

  let totalSalaries = 0;
  let totalAdvancesSum = 0;
  let totalRemaining = 0;
  let employeesWithNegativeBalance = 0;

  employees.forEach(employee => {
    const empSalary = getTotalSalary(employee);
    const empAdvances = advances
      .filter(a => a.employeeId === employee.id)
      .reduce((sum, a) => sum + a.amount, 0);

    totalSalaries += empSalary;
    totalAdvancesSum += empAdvances;
    const balance = empSalary - empAdvances;
    totalRemaining += balance;
    if (balance < 0) employeesWithNegativeBalance++;
  });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('1. RESUMO EXECUTIVO', 20, yPosition);
  yPosition += 15;

  doc.setLineWidth(0.3);
  doc.rect(20, yPosition - 5, 170, 70);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Total em Remuneracoes Mensais: ${formatBRL(totalSalaries)}`, 25, yPosition + 8);
  doc.text(`Total em Adiantamentos Pagos: ${formatBRL(totalAdvancesSum)}`, 25, yPosition + 18);

  const generalPercentage = totalSalaries > 0 ? (totalAdvancesSum / totalSalaries) * 100 : 0;
  doc.text(`Percentual Geral Utilizado: ${generalPercentage.toFixed(1)}%`, 25, yPosition + 28);

  doc.line(25, yPosition + 35, 185, yPosition + 35);

  doc.setFont('helvetica', 'bold');
  if (totalRemaining < 0) {
    doc.setTextColor(200, 0, 0);
    doc.text(`Valor Total a Regularizar: ${formatBRL(Math.abs(totalRemaining))}`, 25, yPosition + 45);
  } else {
    doc.setTextColor(0, 128, 0);
    doc.text(`Saldo Total Disponivel: ${formatBRL(totalRemaining)}`, 25, yPosition + 45);
  }
  doc.setTextColor(0, 0, 0);

  doc.setFont('helvetica', 'normal');
  if (employeesWithNegativeBalance > 0) {
    doc.setTextColor(200, 0, 0);
    doc.text(`${employeesWithNegativeBalance} funcionario(s) com saldo negativo`, 25, yPosition + 55);
  } else {
    doc.setTextColor(0, 128, 0);
    doc.text('Todos os funcionarios dentro do limite salarial', 25, yPosition + 55);
  }
  doc.setTextColor(0, 0, 0);
  yPosition += 85;

  const departmentStats: Record<string, { employees: number; totalSalary: number; totalAdvances: number }> = {};
  employees.forEach(employee => {
    const dept = employee.department;
    if (!departmentStats[dept]) {
      departmentStats[dept] = { employees: 0, totalSalary: 0, totalAdvances: 0 };
    }
    const empSalary = getTotalSalary(employee);
    const empAdv = advances.filter(a => a.employeeId === employee.id).reduce((s, a) => s + a.amount, 0);
    departmentStats[dept].employees++;
    departmentStats[dept].totalSalary += empSalary;
    departmentStats[dept].totalAdvances += empAdv;
  });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('2. ANALISE POR DEPARTAMENTO', 20, yPosition);
  yPosition += 15;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DEPARTAMENTO', 25, yPosition);
  doc.text('FUNC.', 80, yPosition);
  doc.text('REMUNERACAO', 105, yPosition);
  doc.text('ADIANTAMENTOS', 140, yPosition);
  doc.text('%', 175, yPosition);
  yPosition += 5;

  doc.setLineWidth(0.2);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  Object.entries(departmentStats).forEach(([dept, stats]) => {
    const percentage = stats.totalSalary > 0 ? (stats.totalAdvances / stats.totalSalary) * 100 : 0;

    doc.text(dept, 25, yPosition);
    doc.text(stats.employees.toString(), 80, yPosition);
    doc.text(formatBRL(stats.totalSalary).replace('R$', '').trim(), 105, yPosition);
    doc.text(formatBRL(stats.totalAdvances).replace('R$', '').trim(), 140, yPosition);
    doc.text(`${percentage.toFixed(1)}%`, 175, yPosition);
    yPosition += 8;
  });

  yPosition += 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('3. DETALHAMENTO POR FUNCIONARIO', 20, yPosition);
  yPosition += 15;

  employees.forEach((employee, employeeIndex) => {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 30;
    }

    const empSalary = getTotalSalary(employee);
    const empAdvances = advances.filter(a => a.employeeId === employee.id);
    const empTotalAdvances = empAdvances.reduce((sum, a) => sum + a.amount, 0);
    const empRemaining = empSalary - empTotalAdvances;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${(employeeIndex + 1).toString().padStart(2, '0')}. ${employee.name.toUpperCase()}`, 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${employee.position} | ${employee.department}`, 25, yPosition);
    yPosition += 8;

    doc.text(`Remuneracao: ${formatBRL(empSalary)}`, 25, yPosition);
    doc.text(`Adiantamentos (${empAdvances.length}): ${formatBRL(empTotalAdvances)}`, 80, yPosition);

    if (empRemaining < 0) {
      doc.setTextColor(200, 0, 0);
      doc.text(`A Regularizar: ${formatBRL(Math.abs(empRemaining))}`, 140, yPosition);
    } else {
      doc.setTextColor(0, 128, 0);
      doc.text(`Saldo: ${formatBRL(empRemaining)}`, 140, yPosition);
    }
    doc.setTextColor(0, 0, 0);
    yPosition += 6;

    const usagePct = empSalary > 0 ? ((empTotalAdvances / empSalary) * 100).toFixed(1) : '0.0';
    doc.text(`Utilizacao: ${usagePct}%`, 25, yPosition);
    yPosition += 10;

    if (empAdvances.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Ultimos adiantamentos:', 25, yPosition);

      const recentAdvances = empAdvances
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);

      const advanceText = recentAdvances.map(advance =>
        `${formatDate(new Date(advance.date))} (${formatBRL(advance.amount)})`
      ).join(' | ');

      doc.text(advanceText, 80, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;
    }

    if (employeeIndex < employees.length - 1) {
      doc.setLineWidth(0.1);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 8;
    }
  });

  if (yPosition > 200) {
    doc.addPage();
    yPosition = 30;
  }

  yPosition += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('4. ESTATISTICAS E INDICADORES', 20, yPosition);
  yPosition += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  if (advances.length > 0) {
    const averageAdvance = totalAdvancesSum / advances.length;
    const averageSalary = totalSalaries / employees.length;

    const employeeStats = employees.map(employee => {
      const empAdv = advances
        .filter(a => a.employeeId === employee.id)
        .reduce((sum, a) => sum + a.amount, 0);
      return { name: employee.name, advances: empAdv };
    });

    const highestAdvances = employeeStats.reduce((max, emp) => emp.advances > max.advances ? emp : max);
    const lowestAdvances = employeeStats.reduce((min, emp) => emp.advances < min.advances ? emp : min);

    doc.text(`Valor Medio por Adiantamento: ${formatBRL(averageAdvance)}`, 25, yPosition);
    yPosition += 8;
    doc.text(`Remuneracao Media: ${formatBRL(averageSalary)}`, 25, yPosition);
    yPosition += 8;
    doc.text(`Maior Total de Adiantamentos: ${highestAdvances.name} - ${formatBRL(highestAdvances.advances)}`, 25, yPosition);
    yPosition += 8;
    doc.text(`Menor Total de Adiantamentos: ${lowestAdvances.name} - ${formatBRL(lowestAdvances.advances)}`, 25, yPosition);
    yPosition += 8;
    doc.text(`Taxa de Utilizacao Media: ${generalPercentage.toFixed(1)}%`, 25, yPosition);
    yPosition += 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('5. OBSERVACOES E RECOMENDACOES', 20, yPosition);
  yPosition += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const recommendations: string[] = [];

  if (employeesWithNegativeBalance > 0) {
    recommendations.push(`${employeesWithNegativeBalance} funcionario(s) apresentam saldo negativo e necessitam regularizacao.`);
  }

  if (generalPercentage > 30) {
    recommendations.push('Taxa de utilizacao de adiantamentos acima de 30% - monitorar fluxo de caixa.');
  }

  if (advances.length > employees.length * 2) {
    recommendations.push('Frequencia alta de adiantamentos - considerar revisao de politicas salariais.');
  }

  recommendations.push('Manter controle mensal dos adiantamentos para evitar comprometimento excessivo da folha.');
  recommendations.push('Considerar implementar limite maximo de 40% da remuneracao para adiantamentos.');

  recommendations.forEach(rec => {
    doc.text(`- ${rec}`, 25, yPosition);
    yPosition += 6;
  });

  yPosition += 15;

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Este relatorio foi gerado automaticamente pelo Sistema de Gestao de Adiantamentos Salariais.', 20, yPosition);
  yPosition += 4;
  doc.text(`Relatorio geral gerado em: ${formatDateTime(new Date())}`, 20, yPosition);
  yPosition += 4;
  doc.text(`Total de paginas: ${doc.getNumberOfPages()} | Confidencial - Uso interno da empresa`, 20, yPosition);

  const fileName = `relatorio_geral_adiantamentos_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};
