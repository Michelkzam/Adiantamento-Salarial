import { DollarSign, Plus, Search, Building2, UserPlus } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-employees' | 'no-advances' | 'no-results' | 'no-departments';
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ type, onAction, actionLabel }: EmptyStateProps) {
  const configs = {
    'no-employees': {
      icon: <UserPlus size={64} className="text-blue-400 dark:text-blue-500" />,
      title: 'Nenhum funcionário cadastrado',
      description: 'Comece adicionando seu primeiro funcionário ao sistema para gerenciar adiantamentos salariais.',
      actionLabel: actionLabel || 'Adicionar Funcionário',
      showAction: true,
    },
    'no-advances': {
      icon: <DollarSign size={64} className="text-green-400 dark:text-green-500" />,
      title: 'Nenhum adiantamento registrado',
      description: 'Registre o primeiro adiantamento para este funcionário.',
      actionLabel: actionLabel || 'Inserir Adiantamento',
      showAction: true,
    },
    'no-results': {
      icon: <Search size={64} className="text-gray-400 dark:text-gray-500" />,
      title: 'Nenhum resultado encontrado',
      description: 'Tente ajustar os termos da sua busca ou limpe o filtro aplicado.',
      actionLabel: actionLabel || 'Limpar Busca',
      showAction: true,
    },
    'no-departments': {
      icon: <Building2 size={64} className="text-purple-400 dark:text-purple-500" />,
      title: 'Nenhum departamento com adiantamentos',
      description: 'Ainda não há adiantamentos registrados por departamento.',
      showAction: false,
    },
  };

  const config = configs[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Animated Icon Container */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl animate-pulse-soft" />
        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-full p-8 shadow-lg">
          {config.icon}
        </div>
      </div>
      
      {/* Text */}
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
        {config.title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
        {config.description}
      </p>
      
      {/* Action Button */}
      {config.showAction && onAction && (
        <button
          onClick={onAction}
          className="btn-primary flex items-center space-x-2"
        >
          {type === 'no-employees' ? <UserPlus size={18} /> : <Plus size={18} />}
          <span>{actionLabel ?? ('actionLabel' in config ? config.actionLabel : '')}</span>
        </button>
      )}
    </div>
  );
}
