/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Entrega, Motorista, FormaPagamento } from '../types';
import { Calendar, Users, DollarSign, Clock, FileText, CheckCircle2, AlertTriangle, XCircle, Download, Printer } from 'lucide-react';

interface ReportPanelProps {
  deliveries: Entrega[];
  drivers: Motorista[];
}

export default function ReportPanel({ deliveries, drivers }: ReportPanelProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedDriverId, setSelectedDriverId] = useState<string>('todos');

  // Format currencies
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

    // Payments collected
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

    // Average Delivery Time (minutes)
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

    // Delivery counts per driver
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

  // EXPORT EXCEL (CSV Format)
  const exportToExcel = () => {
    let csv = '\uFEFF'; // BOM for Excel UTF-8 representation
    csv += 'Nota Fiscal;Pedido;Cliente;Endereço;Volumes;Valor Venda;Pagamento;Status;Motorista;Previsão;Finalizado Em\n';

    filteredDeliveries.forEach(d => {
      const driverName = drivers.find(drv => drv.id === d.motoristaId)?.nome || 'Não designado';
      const statusText = d.status === 'entregue' ? 'Concluída' : d.status === 'nao_entregue' ? 'Falhou' : d.status === 'cancelada' ? 'Cancelada' : 'Pendente';
      const finishedAt = d.comprovante?.dataHoraEntrega ? new Date(d.comprovante.dataHoraEntrega).toLocaleString('pt-BR') : '-';

      const line = [
        d.numeroNF,
        d.numeroPedido || '-',
        d.cliente.nome.replace(/;/g, ','),
        `${d.endereco.ruaNumero}, ${d.endereco.bairro}`.replace(/;/g, ','),
        d.volumes,
        d.valorVenda.toFixed(2),
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

  // EXPORT PDF / PRINT VIEW
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
            .card { border: 1px solid #e2e8f0; padding: 12px; rounded-lg; background-color: #f8fafc; }
            .card-title { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .card-val { font-size: 16px; font-weight: bold; margin-top: 4px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
            th { background-color: #0f172a; color: white; text-align: left; padding: 8px; font-weight: bold; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 40px; font-size: 10px; text-align: center; color: #94a3b8; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório Consolidado de Entregas</h1>
          <div class="meta">
            Período: ${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')} | 
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

          <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">Valores Recebidos por Canal (Em campo):</div>
          <div class="grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="card">
              <div class="card-title">Dinheiro Espécie</div>
              <div class="card-val">${formatCurrency(reportStats.cashCollected)}</div>
            </div>
            <div class="card">
              <div class="card-title">PIX Instantâneo</div>
              <div class="card-val">${formatCurrency(reportStats.pixCollected)}</div>
            </div>
            <div class="card">
              <div class="card-title">Cartão Débito/Crédito</div>
              <div class="card-val">${formatCurrency(reportStats.cardCollected)}</div>
            </div>
          </div>

          <h2 style="font-size: 13px; margin-top: 24px; margin-bottom: 8px;">Lista Analítica de Entregas</h2>
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
                    <td>${new Date(d.dataEntregaPrevista).toLocaleDateString('pt-BR')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            FastGestão Entregas - Comprovante e Logística de Precisão
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
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <FileText className="w-5 h-5 text-amber-500" />
            Relatórios e Auditoria
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Filtre, analise e exporte dados das entregas do período</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Planilha Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir PDF
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Data Início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Data Fim</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Filtrar por Motorista</label>
          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs focus:outline-none focus:border-amber-500 font-semibold"
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
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Período</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{reportStats.total}</p>
          <p className="text-[10px] text-slate-500 mt-1">Registradas na base</p>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-start text-emerald-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Entregas Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{reportStats.deliveredCount}</p>
          <p className="text-[10px] text-emerald-500 mt-1 font-semibold">
            {reportStats.total > 0 ? Math.round((reportStats.deliveredCount / reportStats.total) * 100) : 0}% de sucesso
          </p>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-start text-indigo-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tempo Médio</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1">{reportStats.avgTimeMinutes} min</p>
          <p className="text-[10px] text-slate-500 mt-1">Do início até a conclusão</p>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-start text-amber-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Faturamento Período</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-black text-amber-400 mt-1 truncate">{formatCurrency(reportStats.totalSalesValue)}</p>
          <p className="text-[10px] text-slate-500 mt-1">Soma das vendas brutas</p>
        </div>
      </div>

      {/* FINANCIAL BREAKDOWN AND MOTORISTS ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial collection canal detail */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Arrecadação e Pagamentos em Campo</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Espécie (Dinheiro)</span>
              <span className="font-bold text-white">{formatCurrency(reportStats.cashCollected)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">PIX Instantâneo</span>
              <span className="font-bold text-white">{formatCurrency(reportStats.pixCollected)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400 font-medium">Cartões de Crédito/Débito</span>
              <span className="font-bold text-white">{formatCurrency(reportStats.cardCollected)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-400 font-medium">Já Pago na Loja (ERP)</span>
              <span className="font-bold text-slate-400">{formatCurrency(reportStats.storePaid)}</span>
            </div>
          </div>
        </div>

        {/* Driver leaderboard performance list */}
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Performance de Entregadores</h3>
          {Object.keys(reportStats.driverPerformance).length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-6">Nenhum entregador realizou entregas no período.</div>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {Object.entries(reportStats.driverPerformance).map(([drvId, item]) => {
                const driverName = drivers.find(d => d.id === drvId)?.nome || 'Motorista Deletado';
                const perf = item as { total: number; delivered: number; failed: number };
                return (
                  <div key={drvId} className="flex justify-between items-center text-xs pb-2 border-b border-slate-800/60 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-white truncate max-w-40">{driverName}</p>
                      <p className="text-[10px] text-slate-400">Total: {perf.total} de rotas</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400">{perf.delivered} concluídas</span>
                      {perf.failed > 0 && <span className="block text-[10px] text-red-400">{perf.failed} falhas</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
