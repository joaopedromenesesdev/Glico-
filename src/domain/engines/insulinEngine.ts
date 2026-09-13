import {
  MedicalParametersProfile,
  MedicalRuleConfig,
  RoundingRule,
} from '../entities/MedicalProfile';

export interface InsulinCalculationResult {
  isApplicable: boolean;               // Verdadeiro se a glicemia atingiu o limite configurado
  calculatedUnits: number | null;      // Dose sugerida após travas e arredondamento (ex: 2.0)
  rawUnits: number | null;             // Dose pura pré-arredondamento e pré-trava
  isExceededCap: boolean;              // Sinaliza se a dose ultrapassou a trava máxima prescrita
  maxCapApplied: number | null;        // Trava máxima estipulada pelo médico
  ruleTypeApplied: string;             // Tipo de regra ('sliding_scale' | 'sensitivity_factor' | 'none')
  explanation: string;                 // Explicação transparente passo a passo do cálculo
  warnings: string[];                  // Alertas clínicos para exibição na tela
  isBlocked: boolean;                  // Verdadeiro se bloqueado por ausência de receita
}

function applyRounding(value: number, rule: RoundingRule): number {
  if (value <= 0) return 0;
  switch (rule) {
    case 'floor_whole':
      return Math.floor(value);
    case 'floor_half':
      return Math.floor(value * 2) / 2;
    case 'round_nearest':
      return Math.round(value * 2) / 2;
    default:
      return Math.floor(value);
  }
}

/**
 * Motor isolado e determinístico de cálculo de insulina ultrarrápida.
 * NUNCA inventa doses ou regras clínicas arbitrárias.
 */
export function calculateInsulinDose(
  glucoseValue: number,
  medicalProfile: MedicalParametersProfile | null
): InsulinCalculationResult {
  const warnings: string[] = [];

  // 1. Verificação de segurança: Validação de perfil médico ativo
  if (!medicalProfile || !medicalProfile.isActive || !medicalProfile.ruleConfig) {
    return {
      isApplicable: false,
      calculatedUnits: null,
      rawUnits: null,
      isExceededCap: false,
      maxCapApplied: null,
      ruleTypeApplied: 'none',
      explanation: 'Cálculo desativado. Não existem parâmetros médicos cadastrados e validados.',
      warnings: [
        'Atenção: Nenhuma dose é sugerida porque o perfil médico de insulina não foi configurado pelo profissional de saúde.',
      ],
      isBlocked: true,
    };
  }

  const rule = medicalProfile.ruleConfig;

  // 2. Verificação do gatilho clínico (Trigger Threshold, ex: >= 140 mg/dL)
  if (glucoseValue < rule.triggerThreshold) {
    return {
      isApplicable: false,
      calculatedUnits: null,
      rawUnits: null,
      isExceededCap: false,
      maxCapApplied: rule.maxDoseCap,
      ruleTypeApplied: rule.type,
      explanation: `Glicemia de ${glucoseValue} mg/dL está abaixo do limite de correção médica configurado (${rule.triggerThreshold} mg/dL). Nenhuma dose necessária.`,
      warnings: [],
      isBlocked: false,
    };
  }

  let rawDose = 0;
  let explanation = '';

  // 3. Execução do modelo prescrito
  if (rule.type === 'sliding_scale') {
    // Modelo A: Tabela de Escala Escalonada Fixa
    const matchedRange = rule.ranges.find(
      (r) => glucoseValue >= r.minGlucose && glucoseValue <= r.maxGlucose
    );

    if (matchedRange) {
      rawDose = matchedRange.doseUnits;
      explanation = `Tabela Fixa Médica: Glicemia ${glucoseValue} mg/dL está na faixa [${matchedRange.minGlucose} - ${matchedRange.maxGlucose} mg/dL] com dose prescrita de ${matchedRange.doseUnits} UI.`;
    } else {
      // Caso a glicemia esteja acima de todas as faixas cadastradas na tabela
      const sortedRanges = [...rule.ranges].sort((a, b) => b.maxGlucose - a.maxGlucose);
      const highestRange = sortedRanges[0];

      if (highestRange && glucoseValue > highestRange.maxGlucose) {
        rawDose = highestRange.doseUnits;
        explanation = `Glicemia muito alta (${glucoseValue} mg/dL) acima da faixa máxima da tabela (${highestRange.maxGlucose} mg/dL).`;
        warnings.push(
          `Glicemia superior ao limite máximo da tabela médica (${highestRange.maxGlucose} mg/dL). Verifique com o médico ou serviço de emergência.`
        );
      } else {
        return {
          isApplicable: true,
          calculatedUnits: null,
          rawUnits: null,
          isExceededCap: false,
          maxCapApplied: rule.maxDoseCap,
          ruleTypeApplied: rule.type,
          explanation: `A glicemia de ${glucoseValue} mg/dL não encontrou uma faixa correspondente na tabela médica.`,
          warnings: ['Faixa não encontrada na prescrição médica.'],
          isBlocked: true,
        };
      }
    }
  } else if (rule.type === 'sensitivity_factor') {
    // Modelo B: Fórmula por Fator de Sensibilidade à Insulina (ISF)
    if (rule.sensitivityFactor <= 0) {
      return {
        isApplicable: true,
        calculatedUnits: null,
        rawUnits: null,
        isExceededCap: false,
        maxCapApplied: rule.maxDoseCap,
        ruleTypeApplied: rule.type,
        explanation: 'Fator de sensibilidade médico inválido (deve ser maior que zero).',
        warnings: ['Parâmetro médico com valor inválido.'],
        isBlocked: true,
      };
    }

    const excessGlucose = Math.max(0, glucoseValue - rule.targetGlucose);
    rawDose = excessGlucose / rule.sensitivityFactor;
    explanation = `Fórmula de Correção: (${glucoseValue} mg/dL [Glicemia] - ${rule.targetGlucose} mg/dL [Alvo]) / ${rule.sensitivityFactor} [FSI] = ${rawDose.toFixed(2)} UI.`;
  }

  // 4. Aplicação de Arredondamento Prescrito
  const roundedDose = applyRounding(rawDose, rule.rounding);

  // 5. Aplicação da Trava de Segurança Máxima (Dose Cap)
  let finalDose = roundedDose;
  let isExceededCap = false;

  if (finalDose > rule.maxDoseCap) {
    finalDose = rule.maxDoseCap;
    isExceededCap = true;
    warnings.push(
      `ATENÇÃO DE SEGURANÇA: A dose calculada de ${roundedDose} UI ultrapassou a trava máxima de segurança prescrita pelo médico (${rule.maxDoseCap} UI). A dose foi travada em ${rule.maxDoseCap} UI.`
    );
  }

  return {
    isApplicable: true,
    calculatedUnits: finalDose,
    rawUnits: rawDose,
    isExceededCap,
    maxCapApplied: rule.maxDoseCap,
    ruleTypeApplied: rule.type,
    explanation,
    warnings,
    isBlocked: false,
  };
}
