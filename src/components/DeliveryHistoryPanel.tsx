/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  History, Calendar, Search, Filter, CheckCircle2, XCircle, Clock, FileText, 
  User, Truck, Phone, MapPin, DollarSign, Download, Eye, RefreshCw 
} from 'lucide-react';
import { Entrega, Motorista, Usuario, EntregaStatus } from '../types';

interface DeliveryHistoryPanelProps {
  deliveries: Entrega[];
  drivers?: Motorista[];
  users?: Usuario[];
  companyName?: string;
  onSelectDelivery?: (delivery: Entrega) => void;
}

export default function DeliveryHistoryPanel({ deliveries, drivers = [], users = [], companyName, onSelectDelivery }: DeliveryHistoryPanelProps) {
  const [periodFilter, setPeriodFilter] = useState<'hoje' | 'ontem' | 'semana' | 'mes' | 'todos'>('mes');
  const [statusFilter, setStatusFilter] = useState<string>('todas');
  const [driverFilter, setDriverFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Date boundary calculation
  const getPeriodDates = (period: 'hoje' | 'ontem' | 'semana' | 'mes' | 'todos') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'hoje') {
      return { start: todayStr, end: todayStr };
    }
    if (period === 'ontem') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
    }
    if (period === 'semana') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      return { start: startOfWeek.toISOString().split('T')[0], end: todayStr };
    }
    if (period === 'mes') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth.toISOString().split('T')[0], end: todayStr };
    }
    return { start: null, end: null };
  };

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    const { start, end } = getPeriodDates(periodFilter);

    return deliveries.filter(d => {
      // Period filter
      if (start && end) {
        const dDate = (d.criadoEm || '').split('T')[0];
        if (dDate < start || dDate > end) return false;
      }

      // Status filter
      if (statusFilter !== 'todas') {
        if (d.status !== statusFilter) return false;
      }

      // Driver filter
      if (driverFilter !== 'todos') {
        const matchesDriver = d.motoristaId === driverFilter || d.entregadorId === driverFilter;
        if (!matchesDriver) return false;
      }

      // Search query (NF, Pedido, Cliente Nome, Telefone, Bairro, Cidade)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQ = 
          (d.numeroNF || '').toLowerCase().includes(q) ||
          (d.numeroPedido || '').toLowerCase().includes(q) ||
          (d.cliente?.nome || '').toLowerCase().includes(q) ||
          (d.cliente?.telefone || '').includes(q) ||
          (d.endereco?.bairro || '').toLowerCase().includes(q) ||
          (d.endereco?.cidade || '').toLowerCase().includes(q) ||
          (d.entregadorNome || '').toLowerCase().includes(q);
        if (!matchesQ) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime());
  }, [deliveries, periodFilter, statusFilter, driverFilter, searchQuery]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            Histórico Completo de Entregas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Consulte todas as entregas finalizadas, entregues, ocorridas ou canceladas no sistema.
          </p>
        </div>

        <div className="text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-900/40 px-3 py-1.5 rounded-xl">
          {filteredDeliveries.length} registros encontrados
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* PERÍODO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Período</label>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['hoje', 'ontem', 'semana', 'mes', 'todos'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg capitalize transition-all ${
                    periodFilter === p ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* STATUS */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
            >
              <option value="todas">Todos os Status</option>
              <option value="entregue">Concluídas / Entregues</option>
              <option value="nao_entregue">Ocorrência / Não Entregue</option>
              <option value="cancelada">Canceladas</option>
              <option value="em_rota">Em Rota</option>
              <option value="aguardando_motorista">Aguardando Motorista</option>
            </select>
          </div>

          {/* ENTREGADOR */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Entregador</label>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
            >
              <option value="todos">Todos os Entregadores</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>

          {/* PESQUISA */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Pesquisa Direta</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busque por NF, Cliente, Tel, Bairro..."
                className="w-full bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* DELIVERIES TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">NF / Pedido</th>
                <th className="px-4 py-3">Cliente & Contato</th>
                <th className="px-4 py-3">Endereço & Bairro</th>
                <th className="px-4 py-3">Entregador</th>
                <th className="px-4 py-3">Valor / Pagto</th>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma entrega encontrada no histórico para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">
                      NF: {d.numeroNF}
                      {d.numeroPedido && <div className="text-[10px] text-slate-400 font-sans">Ped: {d.numeroPedido}</div>}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{d.cliente?.nome || 'N/I'}</div>
                      <div className="text-[11px] text-slate-400">{d.cliente?.telefone || 'Sem tel.'}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-300">{d.endereco?.ruaNumero}, {d.endereco?.numero}</div>
                      <div className="text-[11px] text-slate-400">{d.endereco?.bairro} — {d.endereco?.cidade}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-300">{d.entregadorNome || 'Não atribuído'}</span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-emerald-400">{formatCurrency(d.valorVenda)}</div>
                      <div className="text-[10px] text-slate-400 uppercase">{d.formaPagamento}</div>
                    </td>

                    <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                      {formatDate(d.comprovante?.dataHoraEntrega || d.atualizadoEm || d.criadoEm)}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border ${
                        d.status === 'entregue' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' :
                        d.status === 'nao_entregue' ? 'bg-red-950/60 text-red-400 border-red-800' :
                        d.status === 'cancelada' ? 'bg-slate-800 text-slate-400 border-slate-700' :
                        'bg-amber-950/60 text-amber-400 border-amber-800'
                      }`}>
                        {d.status === 'entregue' ? 'Entregue' :
                         d.status === 'nao_entregue' ? 'Não Entregue' :
                         d.status === 'cancelada' ? 'Cancelada' : d.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {onSelectDelivery && (
                        <button
                          onClick={() => onSelectDelivery(d)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                          title="Ver detalhes da entrega"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
