import AsyncStorage from '@react-native-async-storage/async-storage';
import { MedicalParametersProfile } from '../../domain/entities/MedicalProfile';
import { IMedicalProfileRepository } from './IMedicalProfileRepository';

const MEDICAL_PROFILE_KEY = '@diabete_app:medical_profile_v1';

export class LocalStorageMedicalProfileRepository implements IMedicalProfileRepository {
  async getProfile(): Promise<MedicalParametersProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(MEDICAL_PROFILE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as MedicalParametersProfile;
    } catch (error) {
      console.error('Erro ao ler perfil médico local:', error);
      return null;
    }
  }

  async saveProfile(profile: MedicalParametersProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(MEDICAL_PROFILE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Erro ao salvar perfil médico local:', error);
      throw new Error('Falha ao gravar perfil médico localmente');
    }
  }

  async clearProfile(): Promise<void> {
    await AsyncStorage.removeItem(MEDICAL_PROFILE_KEY);
  }
}
