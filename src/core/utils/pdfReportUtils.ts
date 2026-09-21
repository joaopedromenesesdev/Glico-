import { Platform } from 'react-native';
import { BloodGlucoseMeasurement, CONTEXT_LABELS, getGlucoseStatus } from '../../domain/entities/GlucoseMeasurement';
import { MedicalParametersProfile } from '../../domain/entities/MedicalProfile';
import { formatDateTime } from './dateUtils';

/**
 * Gera HTML estilizado para relatório médico em PDF
 */
export function generatePdfHtml(
  measurements: BloodGlucoseMeasurement[],
  medicalProfile: MedicalParametersProfile | null,
  patientName = 'Mamãe',
): string {
  const active = measurements
    .filter((m) => !m.isDeleted)
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());

  // Cálculo de métricas
  const values = active.map((m) => m.value);
  const count = values.length;
  const avg = count > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / count) : 0;
  const min = count > 0 ? Math.min(...values) : 0;
  const max = count > 0 ? Math.max(...values) : 0;
  const inTarget = values.filter((v) => v >= 70 && v <= 139).length;
  const targetPercent = count > 0 ? Math.round((inTarget / count) * 100) : 0;

  // Período
  const firstDate = active.length > 0 ? formatDateTime(active[active.length - 1].measuredAt) : '--';
  const lastDate = active.length > 0 ? formatDateTime(active[0].measuredAt) : '--';
  const today = new Date().toLocaleDateString('pt-BR');

  // Estimativa de HbA1c (ADAG)
  const hba1cPercent = count > 0 ? ((avg + 46.7) / 28.7).toFixed(1) : '--';

  // Informações do perfil médico
  let medicalInfo = '';
  if (medicalProfile && medicalProfile.isActive && medicalProfile.ruleConfig) {
    const modelo = medicalProfile.ruleConfig.type === 'sliding_scale'
      ? 'Tabela de Escala Fixa'
      : 'Fator de Sensibilidade (ISF)';
    medicalInfo = `
      <div class="medical-box">
        <h3>⚙️ Prescrição Médica Ativa</h3>
        <p><strong>Médico(a):</strong> ${medicalProfile.doctorName || 'Não informado'}</p>
        <p><strong>Data da Receita:</strong> ${medicalProfile.prescriptionDate || 'Não informada'}</p>
        <p><strong>Modelo:</strong> ${modelo}</p>
        <p><strong>Gatilho de Correção:</strong> A partir de ${medicalProfile.ruleConfig.triggerThreshold} mg/dL</p>
        <p><strong>Dose Máxima:</strong> ${medicalProfile.ruleConfig.maxDoseCap} UI</p>
      </div>
    `;
  }

  // Gerar linhas da tabela de medições (limitar a 50 para PDF legível)
  const tableRows = active.slice(0, 50).map((m) => {
    const status = getGlucoseStatus(m.value);
    const statusColor = status === 'hypo' ? '#F59E0B'
      : status === 'target' ? '#10B981'
      : status === 'elevated' ? '#6366F1'
      : '#EF4444';
    const statusLabel = status === 'hypo' ? 'Hipo'
      : status === 'target' ? 'Normal'
      : status === 'elevated' ? 'Elevada'
      : 'Alta';
    const contextLabel = CONTEXT_LABELS[m.context]?.label || m.context;
    const insulinCol = m.appliedInsulinDose && m.appliedInsulinDose > 0 ? `${m.appliedInsulinDose} UI` : '-';
    const notesCol = m.notes || '-';

    return `
      <tr>
        <td>${formatDateTime(m.measuredAt)}</td>
        <td style="font-weight:700;">${m.value} mg/dL</td>
        <td><span class="status-badge" style="background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}40;">${statusLabel}</span></td>
        <td>${contextLabel}</td>
        <td>${insulinCol}</td>
        <td style="font-size:11px;color:#666;">${notesCol}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      color: #0F172A;
      padding: 32px;
      background: #fff;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0D9488;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header-left h1 {
      font-size: 24px;
      color: #0D9488;
      margin-bottom: 2px;
    }
    .header-left h2 {
      font-size: 16px;
      color: #475569;
      font-weight: 500;
    }
    .header-right {
      text-align: right;
      color: #64748B;
      font-size: 12px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric-card {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 14px;
      text-align: center;
    }
    .metric-card .label {
      font-size: 11px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .metric-card .value {
      font-size: 26px;
      font-weight: 800;
      margin: 4px 0;
    }
    .metric-card .sub {
      font-size: 11px;
      color: #94A3B8;
    }
    .medical-box {
      background: #F0FDFA;
      border: 1px solid #99F6E4;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 20px;
    }
    .medical-box h3 {
      font-size: 14px;
      color: #0F766E;
      margin-bottom: 8px;
    }
    .medical-box p {
      font-size: 12px;
      color: #334155;
      margin-bottom: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    table thead th {
      background: #F1F5F9;
      padding: 8px 6px;
      text-align: left;
      font-size: 11px;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 2px solid #E2E8F0;
    }
    table tbody td {
      padding: 7px 6px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 12px;
      vertical-align: middle;
    }
    table tbody tr:nth-child(even) {
      background: #FAFBFC;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 700;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #E2E8F0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 2px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
    }
    .footer-sig {
      text-align: center;
      min-width: 220px;
    }
    .footer-sig .line {
      border-top: 1px solid #94A3B8;
      margin-top: 48px;
      padding-top: 6px;
      font-size: 12px;
      color: #64748B;
    }
    .footer-note {
      font-size: 10px;
      color: #94A3B8;
      max-width: 300px;
      line-height: 1.4;
    }
    @media print {
      body { padding: 16px; }
      .header { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>📋 Glico+ — Relatório de Glicemia</h1>
      <h2>Paciente: ${patientName}</h2>
    </div>
    <div class="header-right">
      <p><strong>Emissão:</strong> ${today}</p>
      <p><strong>Período:</strong> ${firstDate} a ${lastDate}</p>
      <p><strong>Total:</strong> ${count} medições</p>
    </div>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="label">Média Glicêmica</div>
      <div class="value" style="color:#0D9488;">${count > 0 ? avg : '--'}</div>
      <div class="sub">mg/dL</div>
    </div>
    <div class="metric-card">
      <div class="label">Na Meta (70-139)</div>
      <div class="value" style="color:#10B981;">${count > 0 ? targetPercent + '%' : '--'}</div>
      <div class="sub">${inTarget} de ${count} leituras</div>
    </div>
    <div class="metric-card">
      <div class="label">Menor / Maior</div>
      <div class="value" style="color:#475569;font-size:20px;">${count > 0 ? min + ' / ' + max : '--'}</div>
      <div class="sub">mg/dL</div>
    </div>
    <div class="metric-card">
      <div class="label">HbA1c Estimada</div>
      <div class="value" style="color:#4338CA;">${hba1cPercent}${count > 0 ? '%' : ''}</div>
      <div class="sub">Fórmula ADAG</div>
    </div>
  </div>

  ${medicalInfo}

  <div class="section-title">📊 Histórico de Medições${count > 50 ? ' (últimas 50)' : ''}</div>
  ${count === 0 ? '<p style="color:#94A3B8;font-style:italic;padding:20px 0;">Nenhuma medição registrada.</p>' : `
  <table>
    <thead>
      <tr>
        <th>Data / Hora</th>
        <th>Glicemia</th>
        <th>Status</th>
        <th>Contexto</th>
        <th>Insulina</th>
        <th>Observações</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  `}

  <div class="footer">
    <div class="footer-note">
      🔒 <strong>Privacidade:</strong> Este relatório foi gerado localmente pelo aplicativo Glico+. Nenhum dado foi compartilhado com servidores externos.
      <br/><br/>
      ⚠️ Os valores de HbA1c são estimativas baseadas na fórmula ADAG e não substituem exames laboratoriais.
    </div>
    <div class="footer-sig">
      <div class="line">Carimbo / Assinatura do Médico(a)</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Gera e compartilha o PDF do relatório médico.
 * - Web: abre janela de impressão nativa (salvar como PDF).
 * - Celular (Android/iOS): gera arquivo PDF e abre menu de compartilhamento.
 */
export async function generateAndSharePdfReport(
  measurements: BloodGlucoseMeasurement[],
  medicalProfile: MedicalParametersProfile | null,
  patientName = 'Mamãe',
): Promise<void> {
  const html = generatePdfHtml(measurements, medicalProfile, patientName);

  if (Platform.OS === 'web') {
    // Web: usar a API nativa de impressão do navegador
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      // Pequeno delay para garantir que o CSS carregue
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      // Fallback se popups estiverem bloqueados
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 2000);
        }, 500);
      }
    }
  } else {
    // Celular: usar expo-print e expo-sharing
    try {
      const Print = require('expo-print');
      const Sharing = require('expo-sharing');

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar Relatório Glico+',
          UTI: 'com.adobe.pdf',
        });
      } else {
        // Fallback: abrir preview de impressão
        await Print.printAsync({ html });
      }
    } catch (err) {
      // Fallback: usar Print.printAsync diretamente
      try {
        const Print = require('expo-print');
        await Print.printAsync({ html });
      } catch (e) {
        console.error('Falha ao gerar PDF:', e);
        throw e;
      }
    }
  }
}
