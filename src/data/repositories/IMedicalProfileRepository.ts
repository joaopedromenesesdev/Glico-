import { MedicalParametersProfile } from '../../domain/entities/MedicalProfile';

export interface IMedicalProfileRepository {
  getProfile(): Promise<MedicalParametersProfile | null>;
  saveProfile(profile: MedicalParametersProfile): Promise<void>;
  clearProfile(): Promise<void>;
}
