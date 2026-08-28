/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Entrega, Motorista, Usuario, Cliente, RegistroAuditoria, StorageMetrics } from '../types';
import { Database } from '../lib/db';
import { 
  Calendar, Users, DollarSign, Clock, FileText, CheckCircle2, AlertTriangle, 
  XCircle, Download, Printer, Database as DbIcon, HardDrive, Trash2, ShieldAlert, RefreshCw, Layers, FileCheck, Image
} from 'lucide-react';

interface ReportPanelProps {
  companyId: string;
  currentUser: Usuario;
  deliveries: Entrega[];
  drivers: Motorista[];
  clients: Cliente[];
  auditLogs: RegistroAuditoria[];
}

export default function ReportPanel({ 
  companyId, 
  currentUser, 
  deliveries, 
  drivers, 
  clients, 
  auditLogs 
}: ReportPanelProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedDriverId, setSelectedDriverId] = useState<string>('todos');

  // Storage Monitor State
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Bulk Delete Form State
  const [bulkStartDate, setBulkStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [bulkEndDate, setBulkEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkMode, setBulkMode] = useState<'only_without_deliveries' | 'all_with_history'>('only_without_deliveries');
  
  // Double Confirmation Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isExecutingBulk, setIsExecutingBulk] = useState(false);
  const [bulkResultMsg, setBulkResultMsg] = useState<string | null>(null);
  const [bulkErrorMsg, setBulkErrorMsg] = useState<string | null>(null);

  // Fetch Storage Metrics
  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const metrics = await Database.getStorageMetrics(companyId);
      setStorageMetrics(metrics);
    } catch (e) {
      console.error('Erro ao buscar métricas:', e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [companyId, deliveries, clients]);

  // Format currency
  const formatCurrency = (val?: number | null) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filter deliveries based on parameters
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const date = d.dataEntregaPrevista;
      const matchDate = date >= startDate && date <= endDate;
      const matchDriver = selectedDriverId === 'todos' || d.motoristaId === selectedDriverId;
      return matchDate && matchDriver;
    });
  }, [deliveries, startDate, endDate, selectedDriverId]);

  // Calculations for reports
  const reportStats = useMemo(() => {
    const total = filteredDeliveries.length;
    const delivered = filteredDeliveries.filter(d => d.status === 'entregue');
    const failed = filteredDeliveries.filter(d => d.status === 'nao_entregue');
    const canceled = filteredDeliveries.filter(d => d.status === 'cancelada');

    const totalVolume = filteredDeliveries.reduce((acc, curr) => acc + (curr.volumes || 0), 0);
    const totalSalesValue = filteredDeliveries.reduce((acc, curr) => acc + curr.valorVenda, 0);

    let cashCollected = 0;
    let cardCollected = 0;
    let pixCollected = 0;
    let storePaid = 0;

    delivered.forEach(d => {
      if (d.formaPagamento === 'dinheiro') cashCollected += d.valorVenda;
      else if (d.formaPagamento === 'cartao_credito' || d.formaPagamento === 'cartao_debito') cardCollected += d.valorVenda;
      else if (d.formaPagamento === 'pix') pixCollected += d.valorVenda;
      else if (d.formaPagamento === 'ja_pago') storePaid += d.valorVenda;
    });

    let totalDeliveryMinutes = 0;
    let timedDeliveriesCount = 0;

    delivered.forEach(d => {
      if (d.iniciadoEm && d.comprovante?.dataHoraEntrega) {
        const start = new Date(d.iniciadoEm).getTime();
        const end = new Date(d.comprovante.dataHoraEntrega).getTime();
        const diffMs = end - start;
        if (diffMs > 0) {
          totalDeliveryMinutes += diffMs / (1000 * 60);
          timedDeliveriesCount++;
        }
      }
    });

    const avgTimeMinutes = timedDeliveriesCount > 0 ? Math.round(totalDeliveryMinutes / timedDeliveriesCount) : 0;

    const driverPerformance: Record<string, { total: number; delivered: number; failed: number }> = {};
    filteredDeliveries.forEach(d => {
      if (!d.motoristaId) return;
      if (!driverPerformance[d.motoristaId]) {
        driverPerformance[d.motoristaId] = { total: 0, delivered: 0, failed: 0 };
      }
      driverPerformance[d.motoristaId].total++;
      if (d.status === 'entregue') driverPerformance[d.motoristaId].delivered++;
      else if (d.status === 'nao_entregue') driverPerformance[d.motoristaId].failed++;
    });

    return {
      total,
      deliveredCount: delivered.length,
      failedCount: failed.length,
      canceledCount: canceled.length,
      totalVolume,
      totalSalesValue,
      cashCollected,
      cardCollected,
      pixCollected,
      storePaid,
      avgTimeMinutes,
      driverPerformance
    };
  }, [filteredDeliveries]);

  // Handle Bulk Cleanup Execution
  const handleExecuteBulkCleanup = async () => {
    if (confirmText.trim().toUpperCase() !== 'EXCLUIR') return;
    setIsExecutingBulk(true);
    setBulkErrorMsg(null);
    setBulkResultMsg(null);

    try {
      const result = await Database.bulkCleanupClients(
        companyId,
        bulkStartDate,
        bulkEndDate,
        bulkMode
      );

      if (result.success) {
        setBulkResultMsg(result.message || 'Limpeza em massa concluída com sucesso!');
        setShowBulkModal(false);
        setConfirmText('');
        loadMetrics();
      } else {
        setBulkErrorMsg(result.error || 'Erro ao realizar a limpeza do banco.');
      }
    } catch (err: any) {
      setBulkErrorMsg(err?.message || 'Erro inesperado.');
    } finally {
      setIsExecutingBulk(false);
    }
  };

  // EXPORT EXCEL (CSV)
  const exportToExcel = () => {
    let csv = '\uFEFF';
    csv += 'Nota Fiscal;Pedido;Cliente;Endereço;Volumes;Valor Venda;Pagamento;Status;Motorista;Previsão;Finalizado Em\n';

    filteredDeliveries.forEach(d => {
      const driverName = drivers.find(drv => drv.id === d.motoristaId)?.nome || 'Não designado';
      const statusText = d.status === 'entregue' ? 'Concluída' : d.status === 'nao_entregue' ? 'Falhou' : d.status === 'cancelada' ? 'Cancelada' : 'Pendente';
      const finishedAt = d.comprovante?.dataHoraEntrega && !isNaN(new Date(d.comprovante.dataHoraEntrega).getTime()) ? new Date(d.comprovante.dataHoraEntrega).toLocaleString('pt-BR') : '-';

      const line = [
        d.numeroNF,
        d.numeroPedido || '-',
        d.cliente?.nome?.replace(/;/g, ',') || 'N/A',
        `${d.endereco?.ruaNumero || ''}, ${d.endereco?.bairro || ''}`.replace(/;/g, ','),
        d.volumes || 1,
        Number(d.valorVenda || 0).toFixed(2),
        d.formaPagamento.toUpperCase(),
        statusText,
        driverName.replace(/;/g, ','),
        d.dataEntregaPrevista,
        finishedAt
      ].join(';');

      csv += line + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_Entregas_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT PDF / PRINT
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const driverFilterName = selectedDriverId === 'todos' ? 'Todos os Motoristas' : drivers.find(d => d.id === selectedDriverId)?.nome || '';

    const htmlContent = `
      <html>
        <head>
          <title>Relatório de Entregas - FastGestão</title>
          <style>
            body { font-family: sans-serif; color: #1e293b; padding: 24px; }
            h1 { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #64748b; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; background-color: #f8fafc; }
            .card-title { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .card-val { font-size: 16px; font-weight: bold; margin-top: 4px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
            th { background-color: #0f172a; color: white; text-align: left; padding: 8px; font-weight: bold; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>Relatório Consolidado de Entregas</h1>
          <div class="meta">
            Período: ${startDate && !isNaN(new Date(startDate).getTime()) ? new Date(startDate).toLocaleDateString('pt-BR') : (startDate || '-')} até ${endDate && !isNaN(new Date(endDate).getTime()) ? new Date(endDate).toLocaleDateString('pt-BR') : (endDate || '-')} | 
            Motorista: ${driverFilterName} | 
            Gerado em: ${new Date().toLocaleString('pt-BR')}
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Total Entregas</div>
              <div class="card-val">${reportStats.total}</div>
            </div>
            <div class="card">
              <div class="card-title">Concluídas com Sucesso</div>
              <div class="card-val">${reportStats.deliveredCount} (${reportStats.total > 0 ? Math.round((reportStats.deliveredCount / reportStats.total) * 100) : 0}%)</div>
            </div>
            <div class="card">
              <div class="card-title">Tempo Médio de Entrega</div>
              <div class="card-val">${reportStats.avgTimeMinutes} minutos</div>
            </div>
            <div class="card">
              <div class="card-title">Valor das Vendas</div>
              <div class="card-val">${formatCurrency(reportStats.totalSalesValue)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Nota Fiscal</th>
                <th>Cliente</th>
                <th>Bairro</th>
                <th>Valor Venda</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th>Motorista</th>
                <th>Previsão</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDeliveries.map(d => {
                const driverName = drivers.find(drv => drv.id === d.motoristaId)?.nome || 'Não designado';
                const statusText = d.status === 'entregue' ? 'Entregue' : d.status === 'nao_entregue' ? 'Falhou' : d.status === 'cancelada' ? 'Cancelado' : 'Pendente';
                return `
                  <tr>
                    <td>${d.numeroNF}</td>
                    <td>${d.cliente.nome}</td>
                    <td>${d.endereco.bairro}</td>
                    <td>${formatCurrency(d.valorVenda)}</td>
                    <td>${d.formaPagamento.toUpperCase()}</td>
                    <td>${statusText}</td>
                    <td>${driverName}</td>
                    <td>${d.dataEntregaPrevista && !isNaN(new Date(d.dataEntregaPrevista).getTime()) ? new Date(d.dataEntregaPrevista).toLocaleDateString('pt-BR') : (d.dataEntregaPrevista || '-')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            FastGestão Entregas - Sistema Central de Logística
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8">
      
      {/* 1. RELATÓRIOS E DESEMPENHO DE ENTREGAS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Relatórios e Indicadores Logísticos
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Filtre, analise e exporte o balanço de entregas do período</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Planilha Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir PDF
            </button>
          </div>
        </div>

        {/* FILTER CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrar por Motorista</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="todos">Todos os Motoristas</option>
              {drivers.map(drv => (
                <option key={drv.id} value={drv.id}>{drv.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* STATS HIGHLIGHT BENTO GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Período</span>
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{reportStats.total}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Registradas na base</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start text-emerald-600">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Entregas Concluídas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{reportStats.deliveredCount}</p>
            <p className="text-[10px] text-emerald-600 mt-1 font-bold">
              {reportStats.total > 0 ? Math.round((reportStats.deliveredCount / reportStats.total) * 100) : 0}% de sucesso
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start text-indigo-600">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tempo Médio</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{reportStats.avgTimeMinutes} min</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Do início até a conclusão</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-start text-amber-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Faturamento Período</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-lg font-black text-amber-600 mt-1 truncate">{formatCurrency(reportStats.totalSalesValue)}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Soma das vendas brutas</p>
          </div>
        </div>
      </div>

      {/* 2. MONITOR DE ARMAZENAMENTO E ESTATÍSTICAS DO BANCO DE DADOS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Monitor de Armazenamento e Banco de Dados</h2>
              <p className="text-xs text-slate-500 font-medium">Consumo de espaço, quantitativo de documentos e estado de integridade</p>
            </div>
          </div>

          <button
            onClick={loadMetrics}
            disabled={loadingMetrics}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-xl border border-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? 'animate-spin text-amber-500' : ''}`} />
            Atualizar Métricas
          </button>
        </div>

        {/* METRICS CARDS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase">Clientes Base</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{storageMetrics?.totalClientes ?? clients.length}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{storageMetrics?.totalClientesAtivos ?? clients.length} ativos</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase text-rose-600">Excluídos</span>
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{storageMetrics?.totalClientesExcluidos ?? 0}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Removidos da base</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase">Entregas</span>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{storageMetrics?.totalEntregas ?? deliveries.length}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Registros na nuvem</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase">Comprovantes</span>
              <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{storageMetrics?.totalComprovantes ?? 0}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Assinaturas / baixas</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[10px] font-bold uppercase">Fotos Anexas</span>
              <Image className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{storageMetrics?.totalFotos ?? 0}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Fachadas e produtos</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-amber-500 mb-1">
              <span className="text-[10px] font-bold uppercase">Espaço Usado</span>
              <DbIcon className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-lg font-black text-amber-600">{storageMetrics?.espacoUtilizadoFormatted ?? '0.5 MB'}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Cota atual</p>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-700">Uso de Armazenamento do Banco Central</span>
            <span className="text-amber-600">{storageMetrics?.espacoUtilizadoFormatted || '0.5 MB'} / 50.0 MB ({storageMetrics?.percentualUso || 1}%)</span>
          </div>
          <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden border border-slate-200">
            <div 
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.max(2, storageMetrics?.percentualUso || 2)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 3. EXCLUSÃO EM MASSA DE CLIENTES & MANUTENÇÃO DO BANCO (ADMIN ONLY) */}
      {currentUser.role === 'admin' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Exclusão em Massa de Clientes & Limpeza de Dados</h2>
              <p className="text-xs text-slate-500 font-medium">Ferramenta restrita a Administradores para expurgo de dados antigos e liberação de espaço</p>
            </div>
          </div>

          {bulkResultMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-400 text-xs font-bold flex items-center justify-between">
              <span>{bulkResultMsg}</span>
              <button onClick={() => setBulkResultMsg(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {bulkErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-between">
              <span>{bulkErrorMsg}</span>
              <button onClick={() => setBulkErrorMsg(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Início do Período</label>
              <input
                type="date"
                value={bulkStartDate}
                onChange={(e) => setBulkStartDate(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] text-[#0F172A] rounded-[12px] min-h-[42px] px-3 font-medium focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Fim do Período</label>
              <input
                type="date"
                value={bulkEndDate}
                onChange={(e) => setBulkEndDate(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] text-[#0F172A] rounded-[12px] min-h-[42px] px-3 font-medium focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Critério de Exclusão</label>
              <select
                value={bulkMode}
                onChange={(e) => setBulkMode(e.target.value as any)}
                className="w-full bg-white border border-[#CBD5E1] text-[#0F172A] rounded-[12px] min-h-[42px] px-3 font-bold focus:outline-none focus:border-[#F59E0B]"
              >
                <option value="only_without_deliveries">Apenas clientes SEM entregas</option>
                <option value="all_with_history">Clientes E histórico de entregas do período</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-slate-500 font-medium max-w-xl">
              ⚠️ A exclusão em massa gera registro no Histórico de Auditoria com horário, responsável e volume de espaço liberado.
            </p>
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Executar Exclusão em Massa
            </button>
          </div>
        </div>
      )}

      {/* 4. HISTÓRICO DE AUDITORIA (LOGS DAS EXCLUSÕES) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Histórico de Auditoria & Segurança</h2>
              <p className="text-xs text-slate-500 font-medium">Rastreabilidade completa de exclusões e manutenções do banco de dados</p>
            </div>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 font-medium">Nenhuma ação crítica registrada na auditoria até o momento.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-extrabold">
                  <th className="p-3">Data & Hora</th>
                  <th className="p-3">Ação</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Descrição da Operação</th>
                  <th className="p-3 text-right">Espaço / Clientes</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                      {log.dataHora && !isNaN(new Date(log.dataHora).getTime()) ? new Date(log.dataHora).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold uppercase">
                        {log.tipoAcao === 'exclusao_cliente' ? 'Exclusão Cliente' : 'Limpeza em Massa'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{log.usuarioNome}</td>
                    <td className="p-3 text-slate-600 max-w-md">{log.descricao}</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-600">
                      {log.detalhes?.espacoLiberadoBytes 
                        ? `${(log.detalhes.espacoLiberadoBytes / 1024).toFixed(1)} KB` 
                        : 'Liberado'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DOUBLE CONFIRMATION MODAL FOR BULK CLEANUP */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.42)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white border border-[#E2E8F0] rounded-[18px] w-full max-w-md p-6 space-y-5 shadow-[0_20px_50px_rgba(15,23,42,0.16)] text-[#0F172A]">
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-[#0F172A]">CONFIRMAÇÃO DE SEGURANÇA</h3>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <p className="font-bold">⚠️ ATENÇÃO: Esta ação é permanente e irreversível!</p>
              <p>Você está prestes a excluir todos os clientes e dados do período de <span className="font-mono font-bold text-[#0F172A]">{bulkStartDate}</span> até <span className="font-mono font-bold text-[#0F172A]">{bulkEndDate}</span>.</p>
              <p className="text-[11px] text-slate-600">Modalidade: {bulkMode === 'only_without_deliveries' ? 'Apenas clientes sem entregas vinculadas' : 'Clientes E todo histórico de entregas'}.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Para confirmar, digite <span className="text-rose-600 uppercase font-mono font-black">EXCLUIR</span> no campo abaixo:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Digite EXCLUIR"
                className="w-full bg-white border border-[#CBD5E1] rounded-[12px] p-2.5 text-xs text-[#0F172A] uppercase font-mono font-bold focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                type="button"
                onClick={() => { setShowBulkModal(false); setConfirmText(''); }}
                className="px-4 py-2 bg-white text-[#334155] border border-[#CBD5E1] hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmText.trim().toUpperCase() !== 'EXCLUIR' || isExecutingBulk}
                onClick={handleExecuteBulkCleanup}
                className={`px-4 py-2 rounded-xl font-bold text-white transition-all cursor-pointer ${
                  confirmText.trim().toUpperCase() === 'EXCLUIR' && !isExecutingBulk
                    ? 'bg-[#E11D48] hover:bg-rose-700 shadow-xs'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isExecutingBulk ? 'Limpando...' : 'Confirmar Exclusão Irreversível'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
