import AsyncStorage from '@react-native-async-storage/async-storage';
import { BloodGlucoseMeasurement } from '../../domain/entities/GlucoseMeasurement';
import { GlucoseFilterOptions, IGlucoseRepository } from './IGlucoseRepository';

const STORAGE_KEY = '@diabete_app:glucose_measurements_v1';

export class LocalStorageGlucoseRepository implements IGlucoseRepository {
  private async loadAllRaw(): Promise<BloodGlucoseMeasurement[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as BloodGlucoseMeasurement[];
    } catch (error) {
      console.error('Erro ao ler medições do armazenamento local:', error);
      return [];
    }
  }

  private async persistAll(items: BloodGlucoseMeasurement[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Erro ao salvar medições no armazenamento local:', error);
      throw new Error('Falha ao gravar medição localmente');
    }
  }

  async getAll(filter?: GlucoseFilterOptions): Promise<BloodGlucoseMeasurement[]> {
    const all = await this.loadAllRaw();

    let filtered = all.filter((item) => !item.isDeleted);

    if (filter?.context && filter.context !== 'all') {
      filtered = filtered.filter((item) => item.context === filter.context);
    }

    if (filter?.startDate) {
      const start = new Date(filter.startDate).getTime();
      filtered = filtered.filter((item) => new Date(item.measuredAt).getTime() >= start);
    }

    if (filter?.endDate) {
      const end = new Date(filter.endDate).getTime();
      filtered = filtered.filter((item) => new Date(item.measuredAt).getTime() <= end);
    }

    // Ordenar por data decrescente (mais recente primeiro)
    filtered.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());

    if (filter?.limit && filter.limit > 0) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  async getById(id: string): Promise<BloodGlucoseMeasurement | null> {
    const all = await this.loadAllRaw();
    const item = all.find((m) => m.id === id);
    return item || null;
  }

  async save(measurement: BloodGlucoseMeasurement): Promise<void> {
    const all = await this.loadAllRaw();
    // Prevenir duplicatas de id
    const existingIndex = all.findIndex((m) => m.id === measurement.id);
    if (existingIndex >= 0) {
      all[existingIndex] = measurement;
    } else {
      all.unshift(measurement);
    }
    await this.persistAll(all);
  }

  async update(measurement: BloodGlucoseMeasurement): Promise<void> {
    const all = await this.loadAllRaw();
    const index = all.findIndex((m) => m.id === measurement.id);
    if (index >= 0) {
      all[index] = {
        ...measurement,
        updatedAt: new Date().toISOString(),
      };
      await this.persistAll(all);
    }
  }

  async delete(id: string): Promise<void> {
    const all = await this.loadAllRaw();
    const index = all.findIndex((m) => m.id === id);
    if (index >= 0) {
      all[index].isDeleted = true;
      all[index].updatedAt = new Date().toISOString();
      await this.persistAll(all);
    }
  }

  async restore(id: string): Promise<void> {
    const all = await this.loadAllRaw();
    const index = all.findIndex((m) => m.id === id);
    if (index >= 0) {
      all[index].isDeleted = false;
      all[index].updatedAt = new Date().toISOString();
      await this.persistAll(all);
    }
  }

  async hardDeleteAll(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}
