export interface SlidingScaleEntry {
  minGlucose: number;  // Limite inferior inclusivo (ex: 140)
  maxGlucose: number;  // Limite superior inclusivo (ex: 180)
  doseUnits: number;   // Unidades de insulina prescritas (ex: 2)
}

export type RoundingRule = 'floor_half' | 'floor_whole' | 'round_nearest';

export interface SlidingScaleConfig {
  type: 'sliding_scale';
  triggerThreshold: number;        // Limiar de início da tabela (ex: 140)
  ranges: SlidingScaleEntry[];     // Lista de faixas da tabela
  maxDoseCap: number;              // Limite de segurança inegociável (ex: 8 UI)
  rounding: RoundingRule;
}

export interface SensitivityFactorConfig {
  type: 'sensitivity_factor';
  triggerThreshold: number;        // Limite para começar a calcular (ex: 140)
  targetGlucose: number;           // Glicemia alvo (ex: 100)
  sensitivityFactor: number;       // mg/dL reduzidos por 1 UI (ex: 40)
  maxDoseCap: number;              // Limite de segurança inegociável (ex: 8 UI)
  rounding: RoundingRule;
}

export type MedicalRuleConfig = SlidingScaleConfig | SensitivityFactorConfig;

export interface MedicalParametersProfile {
  id: string;
  doctorName?: string;
  prescriptionDate?: string;
  ruleConfig: MedicalRuleConfig | null;  // null = sem parâmetros configurados (bloqueia cálculo)
  isActive: boolean;
  patientAcknowledgedAt?: string;
  notes?: string;
  updatedAt: string;
}
