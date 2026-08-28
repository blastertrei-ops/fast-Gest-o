import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badgeText?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, badgeText, action }: PageHeaderProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-extrabold text-slate-900 tracking-tight">{title}</h1>
            {badgeText && (
              <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full shadow-xs">
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return <div className={`space-y-6 ${className}`}>{children}</div>;
}

export interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerAction?: React.ReactNode;
}

export function ContentCard({ children, className = '', title, subtitle, icon: Icon, headerAction }: ContentCardProps) {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-amber-500 shrink-0" />}
            <div>
              {title && <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h3>}
              {subtitle && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export interface ActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function ActionBar({ children, className = '' }: ActionBarProps) {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {children}
    </div>
  );
}

export interface TableCardProps {
  children: React.ReactNode;
  className?: string;
}

export function TableCard({ children, className = '' }: TableCardProps) {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs ${className}`}>
      {children}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-[18px] p-8 text-center space-y-3 shadow-xs">
      {Icon && <Icon className="w-10 h-10 text-slate-300 mx-auto" />}
      <div>
        <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
        {description && <p className="text-xs text-slate-500 font-medium mt-1 max-w-md mx-auto">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export const AppEmptyState = EmptyState;

export function AppLoadingState({ message = "Carregando dados..." }: { message?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-[18px] p-8 text-center space-y-3 shadow-xs">
      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xs font-bold text-slate-600">{message}</p>
    </div>
  );
}

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: (e?: any) => void;
  type?: 'button' | 'submit' | 'reset';
}

export function AppButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  className = '',
  ...props
}: AppButtonProps) {
  const base = "font-bold rounded-xl transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";
  
  const variants = {
    primary: "bg-[#FF9800] text-[#111827] hover:bg-[#f59e0b] active:bg-[#d97706] shadow-xs",
    secondary: "bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 active:bg-slate-100",
    danger: "bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] hover:bg-rose-100 active:bg-rose-200",
    success: "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] hover:bg-emerald-100 active:bg-emerald-200"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs min-h-[36px]",
    md: "px-4 py-2 text-xs min-h-[42px]",
    lg: "px-5 py-2.5 text-sm min-h-[46px]"
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Aguarde...</span>
        </>
      ) : children}
    </button>
  );
}

export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(({
  label,
  error,
  icon: Icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-[#0F172A]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs placeholder-[#94A3B8] transition-all focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] focus:outline-none ${Icon ? 'pl-10' : ''} ${error ? 'border-rose-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
    </div>
  );
});
AppInput.displayName = 'AppInput';

export interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const AppSelect = React.forwardRef<HTMLSelectElement, AppSelectProps>(({
  label,
  error,
  children,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-[#0F172A]">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`w-full bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[12px] min-h-[46px] px-3.5 text-xs transition-all focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] focus:outline-none cursor-pointer ${error ? 'border-rose-500' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
    </div>
  );
});
AppSelect.displayName = 'AppSelect';

export interface AppTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const AppTextarea = React.forwardRef<HTMLTextAreaElement, AppTextareaProps>(({
  label,
  error,
  className = '',
  id,
  ...props
}, ref) => {
  const areaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={areaId} className="block text-xs font-bold text-[#0F172A]">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        className={`w-full bg-white text-[#0F172A] border border-[#CBD5E1] rounded-[12px] p-3 text-xs placeholder-[#94A3B8] transition-all focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] focus:outline-none ${error ? 'border-rose-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] font-semibold text-rose-600 mt-1">{error}</p>}
    </div>
  );
});
AppTextarea.displayName = 'AppTextarea';

export interface AppBadgeProps {
  variant?: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'slate';
  children: React.ReactNode;
  className?: string;
}

export function AppBadge({ variant = 'amber', children, className = '' }: AppBadgeProps) {
  const styles = {
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    purple: "bg-purple-50 text-purple-800 border-purple-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200"
  };
  return (
    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export interface AppAlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function AppAlert({ type = 'info', title, children, onClose, className = '' }: AppAlertProps) {
  const styles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    error: "bg-rose-50 border-rose-200 text-rose-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-blue-50 border-blue-200 text-blue-900"
  };

  return (
    <div className={`p-4 rounded-[12px] border text-xs font-medium relative flex items-start gap-3 ${styles[type]} ${className}`}>
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-extrabold text-xs mb-1">{title}</h5>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export function AppModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  maxWidth = '2xl'
}: AppModalProps) {
  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
      <div
        className={`bg-white border border-[#E2E8F0] rounded-[18px] w-full ${widthClasses[maxWidth]} max-h-[90vh] flex flex-col shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A] overflow-hidden`}
      >
        {/* CABEÇALHO BRANCO FIXO */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#0F172A]">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition-all cursor-pointer"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* CONTEÚDO CLARO COM ROLAGEM */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>

        {/* RODAPÉ BRANCO FIXO COM AÇÕES */}
        {footer && (
          <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AppDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AppDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer
}: AppDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
      <div className="bg-white border-l border-[#E2E8F0] w-full max-w-md h-full flex flex-col shadow-2xl text-[#0F172A]">
        {/* CABEÇALHO BRANCO FIXO */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition-all cursor-pointer"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* CONTEÚDO CLARO COM ROLAGEM */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>

        {/* RODAPÉ BRANCO FIXO */}
        {footer && (
          <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isConfirming?: boolean;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ComponentType<{ className?: string }>;
}

export function AppDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  isConfirming,
  variant = 'danger',
  icon: Icon
}: AppDialogProps) {
  if (!isOpen) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={Icon}
      maxWidth="md"
      footer={
        <>
          <AppButton variant="secondary" onClick={onClose} disabled={isConfirming}>
            {cancelText}
          </AppButton>
          <AppButton variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isConfirming}>
            {confirmText}
          </AppButton>
        </>
      }
    >
      <p className="text-xs text-slate-600 leading-relaxed font-medium">{description}</p>
    </AppModal>
  );
}

