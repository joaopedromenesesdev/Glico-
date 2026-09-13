import { calculateEstimatedHbA1c } from '../hba1cEngine';
import { BloodGlucoseMeasurement } from '../../entities/GlucoseMeasurement';

describe('HbA1cEngine (Estimativa Estatística ADAG / Nathan et al.)', () => {
  const createMockMeasurements = (count: number, avgValue: number): BloodGlucoseMeasurement[] => {
    const list: BloodGlucoseMeasurement[] = [];
    const baseDate = new Date('2026-06-01T08:00:00.000Z');

    for (let i = 0; i < count; i++) {
      const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      list.push({
        id: `mock-${i}`,
        value: avgValue + (i % 2 === 0 ? 5 : -5), // oscilação em torno da média
        measuredAt: date.toISOString(),
        context: 'fasting',
        isDeleted: false,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
      });
    }
    return list;
  };

  it('deve retornar status insufficient_data para menos de 30 medições', () => {
    const measurements = createMockMeasurements(15, 130);
    const result = calculateEstimatedHbA1c(measurements);

    expect(result.confidenceLevel).toBe('insufficient_data');
    expect(result.estimatedHbA1cPercent).toBeNull();
    expect(result.readingsCount).toBe(15);
  });

  it('deve retornar status preliminary para entre 30 e 59 medições', () => {
    const measurements = createMockMeasurements(40, 154);
    const result = calculateEstimatedHbA1c(measurements);

    expect(result.confidenceLevel).toBe('preliminary');
    expect(result.estimatedHbA1cPercent).not.toBeNull();
    // Para média 154 mg/dL: (154 + 46.7) / 28.7 = 200.7 / 28.7 = ~7.0%
    expect(result.estimatedHbA1cPercent).toBeCloseTo(7.0, 1);
  });

  it('deve calcular corretamente HbA1c com status reliable para >= 60 medições em 60+ dias', () => {
    const measurements = createMockMeasurements(75, 126);
    const result = calculateEstimatedHbA1c(measurements);

    expect(result.confidenceLevel).toBe('reliable');
    // Para média 126 mg/dL: (126 + 46.7) / 28.7 = 172.7 / 28.7 = 6.0%
    expect(result.estimatedHbA1cPercent).toBeCloseTo(6.0, 1);
    expect(result.estimatedHbA1cIfccMmol).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('Não substitui o exame laboratorial');
  });

  it('deve ignorar registros marcados com soft delete (isDeleted = true)', () => {
    const active = createMockMeasurements(35, 140);
    const deleted: BloodGlucoseMeasurement = {
      id: 'del-1',
      value: 600, // valor extremo deletado
      measuredAt: '2026-06-10T08:00:00.000Z',
      context: 'fasting',
      isDeleted: true,
      createdAt: '2026-06-10T08:00:00.000Z',
      updatedAt: '2026-06-10T08:00:00.000Z',
    };

    const result = calculateEstimatedHbA1c([...active, deleted]);
    expect(result.readingsCount).toBe(35);
    expect(result.averageGlucoseMgDl).toBeCloseTo(140, 0);
  });
});
