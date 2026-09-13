import { BloodGlucoseMeasurement, CONTEXT_LABELS } from '../../domain/entities/GlucoseMeasurement';
import { formatDateTime } from './dateUtils';

/**
 * Gera relatório em texto amigável para envio direto via WhatsApp para o médico
 */
export function generateDoctorTextReport(
  measurements: BloodGlucoseMeasurement[],
  patientName = 'Mamãe'
): string {
  const active = measurements
    .filter((m) => !m.isDeleted)
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());

  if (active.length === 0) {
    return `Relatório de Glicemia - ${patientName}\nNenhuma medição registrada.`;
  }

  const values = active.map((m) => m.value);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);

  let text = `📋 *RELATÓRIO DE GLICEMIA — GLICO+*\n`;
  text += `👤 Paciente: ${patientName}\n`;
  text += `📅 Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}\n`;
  text += `🔢 Total de Medições: ${active.length}\n`;
  text += `📊 Média Glicêmica: ${avg} mg/dL\n`;
  text += `📉 Menor Valor: ${min} mg/dL | 📈 Maior Valor: ${max} mg/dL\n\n`;
  text += `*Últimas Medições Registradas:*\n`;

  // Mostrar as últimas 30 medições
  const recent = active.slice(0, 30);
  recent.forEach((m) => {
    const contextName = CONTEXT_LABELS[m.context]?.label || m.context;
    let line = `• ${formatDateTime(m.measuredAt)}: *${m.value} mg/dL* (${contextName})`;
    if (m.appliedInsulinDose && m.appliedInsulinDose > 0) {
      line += ` 💉 ${m.appliedInsulinDose} UI`;
    }
    if (m.notes) {
      line += ` - Obs: ${m.notes}`;
    }
    text += line + '\n';
  });

  if (active.length > 30) {
    text += `\n_(+ ${active.length - 30} medições anteriores arquivadas)_`;
  }

  return text;
}

/**
 * Gera formato CSV para exportação em planilha
 */
export function generateCsvReport(measurements: BloodGlucoseMeasurement[]): string {
  const headers = ['ID', 'Data_Hora_ISO', 'Data_Hora_Formatada', 'Glicemia_mg_dL', 'Contexto', 'Insulina_Aplicada_UI', 'Observacoes'];
  const rows = measurements
    .filter((m) => !m.isDeleted)
    .map((m) => [
      m.id,
      m.measuredAt,
      `"${formatDateTime(m.measuredAt)}"`,
      m.value,
      `"${CONTEXT_LABELS[m.context]?.label || m.context}"`,
      m.appliedInsulinDose || '',
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
