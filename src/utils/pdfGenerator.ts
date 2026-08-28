/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Entrega, Empresa, Motorista } from '../types';
import { DEFAULT_DELIVERY_FORM_CONFIG } from '../components/DeliveryFormConfigPanel';

export function getDeliveryFormConfig(delivery: Entrega, company?: Empresa) {
  if (delivery.formSnapshot?.standardFields?.length) {
    return delivery.formSnapshot;
  }
  if (company?.deliveryFormConfig?.standardFields?.length) {
    return company.deliveryFormConfig;
  }
  return DEFAULT_DELIVERY_FORM_CONFIG;
}

export function formatCurrency(val?: number | null) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getFieldValue(delivery: Entrega, fieldId: string, customLabel?: string): string | undefined {
  switch (fieldId) {
    case 'cliente':
    case 'clienteNome':
      return delivery.cliente?.nome;
    case 'telefone':
    case 'clienteTelefone':
      return delivery.cliente?.telefone ? `${delivery.cliente.telefone}${delivery.cliente.whatsapp ? ' / ' + delivery.cliente.whatsapp : ''}` : undefined;
    case 'clienteWhatsapp':
      return delivery.cliente?.whatsapp;
    case 'clienteDocumento':
      return delivery.cliente?.documento;
    case 'rua':
    case 'endereco':
      return delivery.endereco?.ruaNumero ? `${delivery.endereco.ruaNumero}${delivery.endereco?.numero ? `, Nº ${delivery.endereco.numero}` : ''}` : undefined;
    case 'bairro':
      return delivery.endereco?.bairro;
    case 'cidade':
      return delivery.endereco?.cidade ? `${delivery.endereco.cidade}${delivery.endereco.estado ? ` / ${delivery.endereco.estado}` : ''}` : undefined;
    case 'cep':
      return delivery.endereco?.cep;
    case 'complemento':
      return delivery.endereco?.complemento;
    case 'numeroPedido':
      return delivery.numeroPedido;
    case 'numeroNF':
      return delivery.numeroNF;
    case 'valorVenda':
      return delivery.valorVenda !== undefined ? formatCurrency(delivery.valorVenda) : undefined;
    case 'valorFrete':
      return delivery.valorFrete ? formatCurrency(delivery.valorFrete) : 'Grátis';
    case 'formaPagamento':
      return delivery.formaPagamento ? delivery.formaPagamento.replace('_', ' ').toUpperCase() : undefined;
    case 'statusPagamento':
      return delivery.statusPagamento === 'pago' ? 'PAGO / RECEBIDO' : 'RECEBER NA ENTREGA';
    case 'volumes':
      return delivery.volumes ? `${delivery.volumes} vol` : undefined;
    case 'dataEntregaPrevista':
      return delivery.dataEntregaPrevista;
    case 'prioridade':
      return delivery.prioridade ? delivery.prioridade.toUpperCase() : undefined;
    case 'observacoes':
      return delivery.observacoes;
    default:
      break;
  }

  // Custom fields lookup by ID or label
  if (delivery.customValues) {
    const val = delivery.customValues[fieldId] ?? (customLabel ? delivery.customValues[customLabel] : undefined);
    if (val !== undefined && val !== null && val !== '') {
      return String(val);
    }
  }

  return undefined;
}

export function generateA4ReceiptHtml(delivery: Entrega, company?: Empresa, driverName?: string): string {
  const config = getDeliveryFormConfig(delivery, company);
  
  // Combine enabled standard & custom fields sorted by order
  const enabledStandard = (config.standardFields || [])
    .filter(f => f.enabled !== false)
    .map(f => ({ id: f.id, label: f.label, order: f.order }));
    
  const enabledCustom = (config.customFields || [])
    .filter(f => f.enabled !== false)
    .map(f => ({ id: f.id, label: f.label, order: f.order }));

  const allFields = [...enabledStandard, ...enabledCustom].sort((a, b) => a.order - b.order);

  const formattedDate = delivery.comprovante?.dataHoraEntrega
    ? new Date(delivery.comprovante.dataHoraEntrega).toLocaleString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const receiverName = delivery.comprovante?.recebedorNome || delivery.cliente?.nome || 'Não informado';
  const driver = delivery.comprovante?.entregadorNome || driverName || delivery.entregadorNome || 'Entregador Designado';

  const fieldsHtml = allFields.map(f => {
    const val = getFieldValue(delivery, f.id, f.label) || '—';
    return `
      <div class="field-item">
        <span class="field-label">${f.label}</span>
        <span class="field-val">${val}</span>
      </div>
    `;
  }).join('');

  const companyName = company?.nome || 'FAST GESTÃO DE ENTREGAS';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Comprovante de Entrega - NF ${delivery.numeroNF}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background-color: #ffffff;
            line-height: 1.4;
            font-size: 12px;
          }
          .a4-card {
            width: 100%;
            max-width: 186mm;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .brand-logo {
            height: 48px;
            width: 48px;
            object-fit: contain;
          }
          .brand-title {
            font-size: 16px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .brand-sub {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
          }
          .meta-box {
            text-align: right;
          }
          .nf-title {
            font-size: 14px;
            font-weight: 900;
            color: #b45309;
            font-family: monospace;
          }
          .status-badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 10px;
            border-radius: 9999px;
            background-color: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #1e293b;
            background-color: #f1f5f9;
            padding: 6px 10px;
            border-left: 4px solid #f59e0b;
            border-radius: 0 4px 4px 0;
            margin: 16px 0 12px 0;
          }
          .fields-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px 16px;
          }
          .field-item {
            display: flex;
            flex-direction: column;
          }
          .field-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          .field-val {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 1px;
            word-break: break-word;
          }
          .signature-wrapper {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
            background-color: #f8fafc;
            text-align: center;
            min-height: 90px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .signature-img {
            max-height: 75px;
            max-width: 100%;
            object-fit: contain;
          }
          .obs-box {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 11px;
            color: #92400e;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px dashed #cbd5e1;
            font-size: 10px;
            color: #94a3b8;
            font-weight: 500;
          }
          @media print {
            body { padding: 0; background-color: #fff; }
            .a4-card { border: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="a4-card">
          <!-- HEADER -->
          <div class="header">
            <div class="brand-box">
              <img src="/branding/fast-gestao-logo.png" alt="FAST" class="brand-logo" onError="this.onerror=null;this.src='/branding/logo-fast-v2.png';" />
              <div>
                <div class="brand-title">FAST GESTÃO</div>
                <div class="brand-sub">COMPROVANTE DE ENTREGA • ${companyName}</div>
              </div>
            </div>
            <div class="meta-box">
              <div class="nf-title">Entrega #${delivery.numeroNF}</div>
              <div class="status-badge">${delivery.status === 'entregue' ? 'ENTREGUE' : delivery.status.toUpperCase()}</div>
              <div style="font-size:10px; color:#64748b; margin-top:2px; font-weight:600;">${formattedDate}</div>
            </div>
          </div>

          <!-- DADOS DA ENTREGA -->
          <div class="section-title">DADOS DA ENTREGA</div>
          <div class="fields-grid">
            ${fieldsHtml}
          </div>

          <!-- COMPROVANTE -->
          <div class="section-title">COMPROVANTE DE ENTREGA</div>
          <div class="fields-grid">
            <div class="field-item">
              <span class="field-label">Recebido por</span>
              <span class="field-val">${receiverName}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Entregador Responsável</span>
              <span class="field-val">${driver}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Conclusão</span>
              <span class="field-val">${formattedDate}</span>
            </div>
            ${delivery.comprovante?.latitudeEntrega != null ? `
              <div class="field-item">
                <span class="field-label">GPS Satélite</span>
                <span class="field-val" style="font-family: monospace; font-size:11px;">
                  ${Number(delivery.comprovante.latitudeEntrega).toFixed(6)}, ${Number(delivery.comprovante.longitudeEntrega || 0).toFixed(6)}
                </span>
              </div>
            ` : ''}
          </div>

          ${delivery.comprovante?.assinaturaUrl ? `
            <div style="margin-top: 12px;">
              <span class="field-label" style="display:block; margin-bottom:4px; font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase;">Assinatura Digital de Confirmação</span>
              <div class="signature-wrapper">
                <img src="${delivery.comprovante.assinaturaUrl}" class="signature-img" alt="Assinatura" />
              </div>
            </div>
          ` : ''}

          ${delivery.comprovante?.observacaoEntrega ? `
            <div class="section-title" style="margin-top: 16px;">OBSERVAÇÃO DO ENTREGADOR</div>
            <div class="obs-box">
              "${delivery.comprovante.observacaoEntrega}"
            </div>
          ` : ''}

          <div class="footer">
            Documento gerado pelo Fast Gestão • Autenticação de Entrega Digital
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;
}
