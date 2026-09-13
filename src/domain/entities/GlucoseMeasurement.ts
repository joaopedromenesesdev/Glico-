export type MeasurementContext =
  | 'fasting'      // Em jejum (ao acordar)
  | 'pre_meal'     // Antes da refeição (café, almoço, jantar)
  | 'post_meal'    // 1h a 2h após refeição
  | 'bedtime'      // Antes de dormir
  | 'dawn'         // Madrugada
  | 'other';       // Outro momento / sintomas

export interface BloodGlucoseMeasurement {
  id: string;                      // UUID único
  value: number;                   // Glicemia em mg/dL (ex: 128)
  measuredAt: string;              // ISO 8601 (ex: "2026-09-13T08:30:00.000Z")
  context: MeasurementContext;     // Contexto da medição
  notes?: string;                  // Anotações opcionais da paciente
  calculatedInsulinDose?: number;  // Dose calculada sugerida (se aplicável)
  appliedInsulinDose?: number;     // Dose efetivamente aplicada pela paciente
  medicalRuleVersionId?: string;   // ID da regra médica vigente
  isDeleted: boolean;              // Soft delete para segurança
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
}

export type GlucoseRangeStatus =
  | 'hypo'     // Hipoglicemia (< 70 mg/dL)
  | 'target'   // Na meta (70 - 139 mg/dL)
  | 'elevated' // Atenção / Avaliar correção (140 - 179 mg/dL)
  | 'high';    // Muito elevada (>= 180 mg/dL)

export function getGlucoseStatus(value: number, customTargetMax = 139): GlucoseRangeStatus {
  if (value < 70) return 'hypo';
  if (value <= customTargetMax) return 'target';
  if (value < 180) return 'elevated';
  return 'high';
}

export const CONTEXT_LABELS: Record<MeasurementContext, { label: string; icon: string; description: string }> = {
  fasting: {
    label: 'Em Jejum',
    icon: 'sunny-outline',
    description: 'Ao acordar pela manhã',
  },
  pre_meal: {
    label: 'Antes da Refeição',
    icon: 'restaurant-outline',
    description: 'Antes do almoço ou jantar',
  },
  post_meal: {
    label: 'Após Refeição',
    icon: 'time-outline',
    description: '1 a 2 horas após comer',
  },
  bedtime: {
    label: 'Antes de Dormir',
    icon: 'moon-outline',
    description: 'Ao deitar para a noite',
  },
  dawn: {
    label: 'Madrugada',
    icon: 'alarm-outline',
    description: 'Durante o sono / 3h da manhã',
  },
  other: {
    label: 'Outro Momento',
    icon: 'medkit-outline',
    description: 'Mal-estar ou horário livre',
  },
};
