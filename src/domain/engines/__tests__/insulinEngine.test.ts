import { calculateInsulinDose } from '../insulinEngine';
import { MedicalParametersProfile } from '../../entities/MedicalProfile';

describe('InsulinCalculationEngine (Motor Clínico de Insulina)', () => {
  const slidingScaleProfile: MedicalParametersProfile = {
    id: 'profile-1',
    doctorName: 'Dr. Roberto Silva (Endocrinologista)',
    prescriptionDate: '2026-09-01',
    isActive: true,
    patientAcknowledgedAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ruleConfig: {
      type: 'sliding_scale',
      triggerThreshold: 140,
      maxDoseCap: 8.0,
      rounding: 'floor_whole',
      ranges: [
        { minGlucose: 140, maxGlucose: 180, doseUnits: 2.0 },
        { minGlucose: 181, maxGlucose: 220, doseUnits: 4.0 },
        { minGlucose: 221, maxGlucose: 260, doseUnits: 6.0 },
        { minGlucose: 261, maxGlucose: 350, doseUnits: 8.0 },
      ],
    },
  };

  const isfProfile: MedicalParametersProfile = {
    id: 'profile-2',
    doctorName: 'Dra. Maria Santos',
    prescriptionDate: '2026-09-01',
    isActive: true,
    patientAcknowledgedAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ruleConfig: {
      type: 'sensitivity_factor',
      triggerThreshold: 140,
      targetGlucose: 100,
      sensitivityFactor: 35, // 35 mg/dL por unidade
      maxDoseCap: 6.0,
      rounding: 'floor_whole',
    },
  };

  it('deve retornar isBlocked = true e nenhuma dose quando o perfil médico for nulo', () => {
    const result = calculateInsulinDose(200, null);
    expect(result.isBlocked).toBe(true);
    expect(result.calculatedUnits).toBeNull();
    expect(result.isApplicable).toBe(false);
  });

  it('deve retornar isBlocked = true se o perfil médico estiver desativado', () => {
    const inactiveProfile: MedicalParametersProfile = { ...slidingScaleProfile, isActive: false };
    const result = calculateInsulinDose(190, inactiveProfile);
    expect(result.isBlocked).toBe(true);
    expect(result.calculatedUnits).toBeNull();
  });

  it('deve retornar isApplicable = false e 0 dose para glicemia abaixo do gatilho de 140 mg/dL', () => {
    const result = calculateInsulinDose(139, slidingScaleProfile);
    expect(result.isApplicable).toBe(false);
    expect(result.calculatedUnits).toBeNull();
  });

  it('deve calcular corretamente a dose exata da faixa para tabela fixa (140 mg/dL -> 2 UI)', () => {
    const result = calculateInsulinDose(140, slidingScaleProfile);
    expect(result.isApplicable).toBe(true);
    expect(result.calculatedUnits).toBe(2.0);
    expect(result.isExceededCap).toBe(false);
  });

  it('deve calcular corretamente faixa intermediária da tabela fixa (210 mg/dL -> 4 UI)', () => {
    const result = calculateInsulinDose(210, slidingScaleProfile);
    expect(result.isApplicable).toBe(true);
    expect(result.calculatedUnits).toBe(4.0);
  });

  it('deve calcular dose por Fator de Sensibilidade: (240 - 100) / 35 = 4 UI arredondado para baixo', () => {
    const result = calculateInsulinDose(240, isfProfile);
    expect(result.isApplicable).toBe(true);
    expect(result.calculatedUnits).toBe(4.0); // 140 / 35 = 4
  });

  it('deve respeitar a trava máxima de segurança (maxDoseCap = 6 UI) para glicemias muito altas', () => {
    // Para glicemia de 450 mg/dL: (450 - 100) / 35 = 10 UI, mas cap é 6 UI
    const result = calculateInsulinDose(450, isfProfile);
    expect(result.isApplicable).toBe(true);
    expect(result.calculatedUnits).toBe(6.0); // travado no cap
    expect(result.isExceededCap).toBe(true);
    expect(result.warnings.some((w) => w.includes('trava máxima'))).toBe(true);
  });

  it('deve suportar arredondamento de meia unidade (floor_half)', () => {
    const halfUnitProfile: MedicalParametersProfile = {
      ...isfProfile,
      ruleConfig: {
        type: 'sensitivity_factor',
        triggerThreshold: 140,
        targetGlucose: 100,
        sensitivityFactor: 35,
        maxDoseCap: 6.0,
        rounding: 'floor_half',
      },
    };
    // Glicemia 225: (225 - 100) / 35 = 125 / 35 = 3.5714 -> floor_half = 3.5 UI
    const result = calculateInsulinDose(225, halfUnitProfile);
    expect(result.calculatedUnits).toBe(3.5);
  });
});
