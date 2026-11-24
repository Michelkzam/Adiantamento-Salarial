import React, { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Employee, AdvanceRecord } from '../types';
import type { ImportResult } from '../db/repository';
import { exportToExcel, importFromExcel, validateImportedData, generateImportTemplate } from '../utils/excelUtils';

interface ImportExportButtonsProps {
  employees: Employee[];
  advances: AdvanceRecord[];
  onImportData: (employees: Employee[], advances: AdvanceRecord[]) => Promise<ImportResult>;
}

export const ImportExportButtons: React.FC<ImportExportButtonsProps> = ({
  employees,
  advances,
  onImportData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
    details?: string[];
  }>({ show: false, type: 'success', message: '' });

  const handleExport = () => {
    try {
      const fileName = exportToExcel(employees, advances);
      setImportStatus({
        show: true,
        type: 'success',
        message: `Backup exportado com sucesso!`,
        details: [
          `Arquivo: ${fileName}`,
          `${employees.length} funcionários exportados`,
          `${advances.length} adiantamentos exportados`,
          'Dados salvos em 4 planilhas: Resumo, Funcionários, Adiantamentos e Análise por Departamento'
        ]
      });
    } catch {
      setImportStatus({
        show: true,
        type: 'error',
        message: 'Erro ao exportar dados',
        details: ['Verifique se o navegador permite downloads', 'Tente novamente em alguns instantes']
      });
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const fileName = generateImportTemplate();
      setImportStatus({
        show: true,
        type: 'success',
        message: 'Template baixado com sucesso!',
        details: [
          `Arquivo: ${fileName}`,
          'Preencha o template com seus dados',
          'Leia as instruções na primeira planilha',
          'Remova as linhas de exemplo antes de importar'
        ]
      });
    } catch {
      setImportStatus({
        show: true,
        type: 'error',
        message: 'Erro ao baixar template',
        details: ['Tente novamente em alguns instantes']
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setImportStatus({
        show: true,
        type: 'error',
        message: 'Formato de arquivo inválido',
        details: ['Apenas arquivos Excel (.xlsx ou .xls) são aceitos']
      });
      return;
    }

    setIsImporting(true);
    
    try {
      const { employees: importedEmployees, advances: importedAdvances } = await importFromExcel(file);
      
      const validationErrors = validateImportedData(importedEmployees, importedAdvances);
      
      if (validationErrors.length > 0) {
        setImportStatus({
          show: true,
          type: 'error',
          message: 'Dados inválidos encontrados',
          details: validationErrors.slice(0, 10)
        });
        setIsImporting(false);
        return;
      }

      const confirmMessage = `Confirma a importação dos dados?\n\n` +
        `• ${importedEmployees.length} funcionários\n` +
        `• ${importedAdvances.length} adiantamentos\n\n` +
        `ATENÇÃO: Esta ação irá SUBSTITUIR todos os dados atuais!`;

      if (window.confirm(confirmMessage)) {
        const result = await onImportData(importedEmployees, importedAdvances);
        const skipped = result.skippedClosed;
        setImportStatus({
          show: true,
          type: skipped > 0 ? 'error' : 'success',
          message: skipped > 0 ? 'Importação concluída com lançamentos ignorados' : 'Dados importados com sucesso!',
          details: [
            `${importedEmployees.length} funcionários importados`,
            `${importedAdvances.length - skipped} adiantamentos importados`,
            ...(skipped > 0
              ? [`${skipped} adiantamento(s) NÃO importado(s): pertencem a competências fechadas. Reabra a competência e importe novamente se necessário.`]
              : []),
            'Todos os dados anteriores foram substituídos',
            'Recomendamos fazer um backup dos dados atuais'
          ]
        });
      }
    } catch (error) {
      setImportStatus({
        show: true,
        type: 'error',
        message: 'Erro ao importar arquivo',
        details: [
          error instanceof Error ? error.message : 'Erro desconhecido',
          'Verifique se o arquivo está no formato correto',
          'Use o template fornecido como base'
        ]
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const closeStatus = () => {
    setImportStatus({ show: false, type: 'success', message: '' });
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileSpreadsheet className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Backup e Restauração</h3>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Exporte todos os dados para Excel (backup) ou importe dados de um arquivo Excel.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={handleExport}
            disabled={employees.length === 0}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 transform ${
              employees.length > 0
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <Download size={20} />
            <span>Exportar Dados</span>
          </button>
          
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg"
          >
            <FileSpreadsheet size={20} />
            <span>Baixar Template</span>
          </button>
          
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 transform ${
              isImporting
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg'
            }`}
          >
            <Upload size={20} />
            <span>{isImporting ? 'Importando...' : 'Importar Dados'}</span>
          </button>
        </div>
        
        {employees.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            * Exportação disponível apenas com funcionários cadastrados
          </p>
        )}
        
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start space-x-2">
            <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">Importante:</p>
              <ul className="space-y-1">
                <li>• A importação substitui TODOS os dados atuais</li>
                <li>• Faça backup antes de importar novos dados</li>
                <li>• Use o template fornecido para evitar erros</li>
                <li>• Verifique os dados antes de confirmar a importação</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {importStatus.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  importStatus.type === 'success' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {importStatus.type === 'success' ? (
                    <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                  ) : (
                    <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                  )}
                </div>
                <h3 className={`text-lg font-semibold ${
                  importStatus.type === 'success' 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {importStatus.type === 'success' ? 'Sucesso' : 'Erro'}
                </h3>
              </div>
              <button
                onClick={closeStatus}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                {importStatus.message}
              </p>
              
              {importStatus.details && importStatus.details.length > 0 && (
                <div className={`p-3 rounded-lg ${
                  importStatus.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20' 
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <ul className="space-y-1 text-sm">
                    {importStatus.details.map((detail, index) => (
                      <li key={index} className={
                        importStatus.type === 'success' 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-red-700 dark:text-red-300'
                      }>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <button
                onClick={closeStatus}
                className={`w-full mt-4 py-2 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                  importStatus.type === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
