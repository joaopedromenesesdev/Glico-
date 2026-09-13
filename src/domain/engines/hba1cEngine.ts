import { BloodGlucoseMeasurement } from '../entities/GlucoseMeasurement';

export type HbA1cConfidence = 'insufficient_data' | 'preliminary' | 'reliable';

export interface HbA1cEstimationResult {
  estimatedHbA1cPercent: number | null;     // Ex: 6.8 (%)
  estimatedHbA1cIfccMmol: number | null;    // Ex: 51 (mmol/mol)
  averageGlucoseMgDl: number | null;        // Glicemia média ponderada/aritmética
  standardDeviation: number | null;         // Desvio padrão
  readingsCount: number;                    // Quantidade de medições válidas
  daysSpan: number;                         // Período total em dias coberto
  confidenceLevel: HbA1cConfidence;
  statusMessage: string;
  disclaimer: string;
}

const ADAG_MULTIPLIER = 28.7;
const ADAG_OFFSET = 46.7;
const MANDATORY_DISCLAIMER =
  'Esta é uma estimativa estatística calculada pelo método ADAG (Nathan et al.) com base nas glicemias registradas. ' +
  'Não substitui o exame laboratorial de sangue venoso (HPLC) solicitado pelo seu médico.';

/**
 * Calcula a estimativa matemática de Hemoglobina Glicada (eHbA1c)
 * a partir de uma série histórica de medições capilares.
 */
export function calculateEstimatedHbA1c(
  measurements: BloodGlucoseMeasurement[],
  targetDaysWindow = 90
): HbA1cEstimationResult {
  // Filtrar apenas medições ativas (não deletadas) e com valor válido (> 0)
  const valid = measurements.filter((m) => !m.isDeleted && m.value > 0);

  if (valid.length === 0) {
    return {
      estimatedHbA1cPercent: null,
      estimatedHbA1cIfccMmol: null,
      averageGlucoseMgDl: null,
      standardDeviation: null,
      readingsCount: 0,
      daysSpan: 0,
      confidenceLevel: 'insufficient_data',
      statusMessage: 'Nenhuma medição registrada para análise.',
      disclaimer: MANDATORY_DISCLAIMER,
    };
  }

  // Ordenar por data crescente
  const sorted = [...valid].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );

  const firstDate = new Date(sorted[0].measuredAt);
  const lastDate = new Date(sorted[sorted.length - 1].measuredAt);
  const daysSpan = Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // Média aritmética das glicemias
  const sum = valid.reduce((acc, curr) => acc + curr.value, 0);
  const averageGlucose = sum / valid.length;

  // Desvio padrão
  const variance =
    valid.reduce((acc, curr) => acc + Math.pow(curr.value - averageGlucose, 2), 0) /
    valid.length;
  const standardDeviation = Math.sqrt(variance);

  // Fórmula ADAG: HbA1c (%) = (eAG + 46.7) / 28.7
  const rawHbA1c = (averageGlucose + ADAG_OFFSET) / ADAG_MULTIPLIER;
  const estimatedHbA1cPercent = Math.round(rawHbA1c * 10) / 10;

  // IFCC (mmol/mol) = (HbA1c[%] - 2.15) * 10.929
  const rawIfcc = (estimatedHbA1cPercent - 2.15) * 10.929;
  const estimatedHbA1cIfccMmol = Math.round(rawIfcc);

  // Determinação do nível de confiança estatística
  let confidenceLevel: HbA1cConfidence = 'reliable';
  let statusMessage = 'Estimativa consistente com boa representatividade histórica.';

  if (valid.length < 30) {
    confidenceLevel = 'insufficient_data';
    statusMessage = `Dados insuficientes (${valid.length} medições). São recomendadas pelo menos 30 medições para uma estimativa inicial.`;
    return {
      estimatedHbA1cPercent: null,
      estimatedHbA1cIfccMmol: null,
      averageGlucoseMgDl: Math.round(averageGlucose),
      standardDeviation: Math.round(standardDeviation),
      readingsCount: valid.length,
      daysSpan,
      confidenceLevel,
      statusMessage,
      disclaimer: MANDATORY_DISCLAIMER,
    };
  } else if (valid.length < 60 || daysSpan < 30) {
    confidenceLevel = 'preliminary';
    statusMessage = `Estimativa preliminar com confiança moderada (${valid.length} medições em ${daysSpan} dias).`;
  }

  return {
    estimatedHbA1cPercent,
    estimatedHbA1cIfccMmol,
    averageGlucoseMgDl: Math.round(averageGlucose),
    standardDeviation: Math.round(standardDeviation),
    readingsCount: valid.length,
    daysSpan,
    confidenceLevel,
    statusMessage,
    disclaimer: MANDATORY_DISCLAIMER,
  };
}
