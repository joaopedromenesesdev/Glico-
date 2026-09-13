import { BloodGlucoseMeasurement } from '../../domain/entities/GlucoseMeasurement';

export interface GlucoseFilterOptions {
  startDate?: string;
  endDate?: string;
  context?: string;
  limit?: number;
}

export interface IGlucoseRepository {
  getAll(filter?: GlucoseFilterOptions): Promise<BloodGlucoseMeasurement[]>;
  getById(id: string): Promise<BloodGlucoseMeasurement | null>;
  save(measurement: BloodGlucoseMeasurement): Promise<void>;
  update(measurement: BloodGlucoseMeasurement): Promise<void>;
  delete(id: string): Promise<void>; // soft delete
  restore(id: string): Promise<void>;
  hardDeleteAll(): Promise<void>; // Limpeza definitiva para LGPD
}
