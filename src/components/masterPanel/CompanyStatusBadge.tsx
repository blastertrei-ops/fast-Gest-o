import { CompanyStatus } from '../../types';

export function CompanyStatusBadge({ status, dark = false }: { status?: CompanyStatus; dark?: boolean }) {
  const styles = dark
    ? { ativa: 'bg-emerald-950/60 text-emerald-400 border-emerald-800', suspensa: 'bg-amber-950/60 text-amber-400 border-amber-800', bloqueada: 'bg-red-950/60 text-red-400 border-red-800', cancelada: 'bg-slate-800 text-slate-400 border-slate-700' }
    : { ativa: 'bg-emerald-50 text-emerald-700 border-emerald-200', suspensa: 'bg-amber-50 text-amber-700 border-amber-200', bloqueada: 'bg-rose-50 text-rose-700 border-rose-200', cancelada: 'bg-rose-50 text-rose-700 border-rose-200' };
  const value = status || 'ativa';
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${styles[value]}`}>{value}</span>;
}
