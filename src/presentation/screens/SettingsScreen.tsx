import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MedicalParametersProfile,
  MedicalRuleConfig,
  SlidingScaleConfig,
  SensitivityFactorConfig,
} from '../../domain/entities/MedicalProfile';
import { BloodGlucoseMeasurement } from '../../domain/entities/GlucoseMeasurement';
import { THEME } from '../theme';
import { generateDoctorTextReport, generateCsvReport } from '../../core/utils/exportUtils';
import { BigButton } from '../components/BigButton';

interface SettingsScreenProps {
  medicalProfile: MedicalParametersProfile | null;
  measurements: BloodGlucoseMeasurement[];
  onSaveMedicalProfile: (profile: MedicalParametersProfile | null) => Promise<void>;
  onHardResetData: () => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  medicalProfile,
  measurements,
  onSaveMedicalProfile,
  onHardResetData,
}) => {
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [doctorName, setDoctorName] = useState<string>(medicalProfile?.doctorName || '');
  const [prescriptionDate, setPrescriptionDate] = useState<string>(
    medicalProfile?.prescriptionDate || new Date().toISOString().split('T')[0]
  );
  const [ruleType, setRuleType] = useState<'sliding_scale' | 'sensitivity_factor'>(
    (medicalProfile?.ruleConfig?.type as any) || 'sliding_scale'
  );
  const [triggerThresholdStr, setTriggerThresholdStr] = useState<string>(
    String(medicalProfile?.ruleConfig?.triggerThreshold || 140)
  );
  const [maxDoseCapStr, setMaxDoseCapStr] = useState<string>(
    String(medicalProfile?.ruleConfig?.maxDoseCap || 8)
  );
  const [rounding, setRounding] = useState<'floor_whole' | 'floor_half'>(
    (medicalProfile?.ruleConfig?.rounding as any) || 'floor_whole'
  );

  // Parâmetros para FSI
  const [targetGlucoseStr, setTargetGlucoseStr] = useState<string>('100');
  const [sensitivityFactorStr, setSensitivityFactorStr] = useState<string>('35');

  // Parâmetros para Tabela Fixa
  const defaultSlidingScaleRanges = [
    { minGlucose: 140, maxGlucose: 180, doseUnits: 2.0 },
    { minGlucose: 181, maxGlucose: 220, doseUnits: 4.0 },
    { minGlucose: 221, maxGlucose: 260, doseUnits: 6.0 },
    { minGlucose: 261, maxGlucose: 350, doseUnits: 8.0 },
  ];

  const handleLoadPrescriptionPreset = async () => {
    const preset: MedicalParametersProfile = {
      id: 'profile-homologated',
      doctorName: 'Dr. Roberto Silva (Endocrinologista)',
      prescriptionDate: '2026-09-01',
      isActive: true,
      patientAcknowledgedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ruleConfig: {
        type: 'sliding_scale',
        triggerThreshold: 140,
        maxDoseCap: 8.0,
        rounding: 'floor_whole',
        ranges: defaultSlidingScaleRanges,
      },
    };

    await onSaveMedicalProfile(preset);
    const msg = 'Prescrição com Tabela Escalonada carregada e ativada com sucesso!';
    Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Sucesso', msg);
  };

  const handleDeactivateMedicalProfile = async () => {
    const confirm = () => onSaveMedicalProfile(null);
    const msg = 'Deseja desativar os parâmetros médicos? O cálculo de insulina será bloqueado.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) confirm();
    } else {
      Alert.alert('Desativar', msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desativar', style: 'destructive', onPress: confirm },
      ]);
    }
  };

  const handleSaveModalConfig = async () => {
    const trigger = parseInt(triggerThresholdStr, 10) || 140;
    const maxCap = parseFloat(maxDoseCapStr) || 8.0;

    let ruleConfig: MedicalRuleConfig;

    if (ruleType === 'sliding_scale') {
      ruleConfig = {
        type: 'sliding_scale',
        triggerThreshold: trigger,
        maxDoseCap: maxCap,
        rounding,
        ranges: defaultSlidingScaleRanges,
      };
    } else {
      ruleConfig = {
        type: 'sensitivity_factor',
        triggerThreshold: trigger,
        targetGlucose: parseInt(targetGlucoseStr, 10) || 100,
        sensitivityFactor: parseFloat(sensitivityFactorStr) || 35,
        maxDoseCap: maxCap,
        rounding,
      };
    }

    const newProfile: MedicalParametersProfile = {
      id: medicalProfile?.id || `profile-${Date.now()}`,
      doctorName: doctorName.trim() || 'Médico Assistente',
      prescriptionDate: prescriptionDate.trim(),
      isActive: true,
      patientAcknowledgedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ruleConfig,
    };

    await onSaveMedicalProfile(newProfile);
    setShowConfigModal(false);
    const msg = 'Configurações médicas salvas e ativadas com sucesso!';
    Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Sucesso', msg);
  };

  const handleShareDoctorReport = async () => {
    const report = generateDoctorTextReport(measurements);
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(report);
        window.alert('📋 Relatório copiado para a área de transferência! Cole no WhatsApp do médico.');
      } catch (err) {
        window.prompt('Copie o relatório abaixo:', report);
      }
    } else {
      Alert.alert('Relatório para o Médico', report);
    }
  };

  const handleExportCsv = () => {
    const csv = generateCsvReport(measurements);
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `glicemia_relatorio_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('CSV Gerado', `Arquivo CSV pronto com ${measurements.length} linhas.`);
    }
  };

  const handleHardReset = () => {
    const msg =
      'ATENÇÃO: Esta ação apagará permanentemente todas as medições e configurações salvas no celular. Deseja continuar?';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        onHardResetData();
        window.alert('Todos os dados foram excluídos com sucesso.');
      }
    } else {
      Alert.alert('Zerar Dados', msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar Tudo', style: 'destructive', onPress: onHardResetData },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Seção de Parâmetros Médicos */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="medkit" size={24} color={THEME.colors.primaryDark} />
          <Text style={styles.sectionTitle}>Parâmetros Médicos de Insulina</Text>
        </View>

        {medicalProfile && medicalProfile.isActive && medicalProfile.ruleConfig ? (
          <View style={styles.activeProfileBox}>
            <View style={styles.statusRow}>
              <View style={styles.statusIndicator} />
              <Text style={styles.statusText}>Regra Médica Ativa</Text>
            </View>

            <Text style={styles.profileDetail}>
              👨‍⚕️ <Text style={{ fontWeight: '700' }}>Médico:</Text>{' '}
              {medicalProfile.doctorName || 'Não especificado'}
            </Text>
            <Text style={styles.profileDetail}>
              📅 <Text style={{ fontWeight: '700' }}>Data da Receita:</Text>{' '}
              {medicalProfile.prescriptionDate || 'Não informada'}
            </Text>
            <Text style={styles.profileDetail}>
              ⚙️ <Text style={{ fontWeight: '700' }}>Modelo:</Text>{' '}
              {medicalProfile.ruleConfig.type === 'sliding_scale'
                ? 'Tabela de Escala Escalonada Fixa'
                : 'Fórmula por Fator de Sensibilidade (ISF)'}
            </Text>
            <Text style={styles.profileDetail}>
              🎯 <Text style={{ fontWeight: '700' }}>Gatilho:</Text> A partir de{' '}
              {medicalProfile.ruleConfig.triggerThreshold} mg/dL
            </Text>
            <Text style={styles.profileDetail}>
              🛡️ <Text style={{ fontWeight: '700' }}>Trava Máxima:</Text>{' '}
              {medicalProfile.ruleConfig.maxDoseCap} UI por dose
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.btnOutline, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowConfigModal(true)}
              >
                <Text style={styles.btnOutlineText}>Editar Parâmetros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnDangerOutline, { flex: 1 }]}
                onPress={handleDeactivateMedicalProfile}
              >
                <Text style={styles.btnDangerOutlineText}>Desativar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.inactiveProfileBox}>
            <Ionicons name="alert-circle-outline" size={32} color="#D97706" />
            <Text style={styles.inactiveTitle}>Nenhuma Prescrição Médica Ativa</Text>
            <Text style={styles.inactiveText}>
              O cálculo de insulina ultrarrápida está desativado por segurança. Para ativá-lo,
              insira a receita médica da paciente.
            </Text>

            <TouchableOpacity
              style={styles.btnPreset}
              onPress={handleLoadPrescriptionPreset}
            >
              <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnPresetText}>
                Carregar Exemplo Clínico de Escala Fixa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnOutline, { marginTop: 10 }]}
              onPress={() => setShowConfigModal(true)}
            >
              <Text style={styles.btnOutlineText}>Cadastrar Nova Prescrição</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Seção de Exportação e Compartilhamento */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="share-social" size={24} color="#0D9488" />
          <Text style={styles.sectionTitle}>Compartilhar com o Médico</Text>
        </View>

        <Text style={styles.sectionDesc}>
          Envie o relatório das medições para seu endocrinologista acompanhar o tratamento:
        </Text>

        <TouchableOpacity
          style={styles.btnShareWhatsapp}
          onPress={handleShareDoctorReport}
        >
          <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.btnShareWhatsappText}>
            Copiar Relatório Formatado para WhatsApp
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnExportCsv} onPress={handleExportCsv}>
          <Ionicons name="document-text-outline" size={20} color="#0D9488" style={{ marginRight: 8 }} />
          <Text style={styles.btnExportCsvText}>Baixar Dados em Planilha (CSV)</Text>
        </TouchableOpacity>
      </View>

      {/* Seção de Privacidade e LGPD */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#0284C7" />
          <Text style={styles.sectionTitle}>Privacidade e LGPD (Lei 13.709/18)</Text>
        </View>

        <Text style={styles.privacyItem}>
          🔒 <Text style={{ fontWeight: '700' }}>Armazenamento 100% Local:</Text> Seus dados de saúde
          ficam salvos apenas na memória do seu smartphone. Nenhum dado é enviado para a nuvem.
        </Text>
        <Text style={styles.privacyItem}>
          🚫 <Text style={{ fontWeight: '700' }}>Sem Rastreadores:</Text> Não usamos telemetria,
          anúncios ou compartilhamento com terceiros.
        </Text>

        <TouchableOpacity style={styles.btnHardReset} onPress={handleHardReset}>
          <Ionicons name="trash" size={18} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.btnHardResetText}>Apagar Todos os Dados do Aplicativo</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Configuração de Parâmetros Médicos */}
      <Modal
        visible={showConfigModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Configurar Prescrição Médica</Text>

              <Text style={styles.inputLabel}>Nome do Médico(a):</Text>
              <TextInput
                style={styles.modalInput}
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder="Ex: Dr. Roberto Silva"
              />

              <Text style={styles.inputLabel}>Data da Receita:</Text>
              <TextInput
                style={styles.modalInput}
                value={prescriptionDate}
                onChangeText={setPrescriptionDate}
                placeholder="AAAA-MM-DD"
              />

              <Text style={styles.inputLabel}>Modelo Clínico:</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity
                  style={[styles.radioBtn, ruleType === 'sliding_scale' && styles.radioBtnActive]}
                  onPress={() => setRuleType('sliding_scale')}
                >
                  <Text
                    style={[
                      styles.radioBtnText,
                      ruleType === 'sliding_scale' && styles.radioBtnTextActive,
                    ]}
                  >
                    Tabela Fixa
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioBtn, ruleType === 'sensitivity_factor' && styles.radioBtnActive]}
                  onPress={() => setRuleType('sensitivity_factor')}
                >
                  <Text
                    style={[
                      styles.radioBtnText,
                      ruleType === 'sensitivity_factor' && styles.radioBtnTextActive,
                    ]}
                  >
                    Fator Sensibilidade
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Gatilho de Correção (mg/dL):</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={triggerThresholdStr}
                onChangeText={(t) => setTriggerThresholdStr(t.replace(/[^0-9]/g, ''))}
              />

              <Text style={styles.inputLabel}>Trava Máxima de Dose (Cap em UI):</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={maxDoseCapStr}
                onChangeText={(t) => setMaxDoseCapStr(t.replace(/[^0-9.]/g, ''))}
              />

              <Text style={styles.inputLabel}>Arredondamento da Caneta:</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity
                  style={[styles.radioBtn, rounding === 'floor_whole' && styles.radioBtnActive]}
                  onPress={() => setRounding('floor_whole')}
                >
                  <Text
                    style={[
                      styles.radioBtnText,
                      rounding === 'floor_whole' && styles.radioBtnTextActive,
                    ]}
                  >
                    Unidade Inteira (1 UI)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioBtn, rounding === 'floor_half' && styles.radioBtnActive]}
                  onPress={() => setRounding('floor_half')}
                >
                  <Text
                    style={[
                      styles.radioBtnText,
                      rounding === 'floor_half' && styles.radioBtnTextActive,
                    ]}
                  >
                    Meia Unidade (0.5 UI)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setShowConfigModal(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSave]}
                  onPress={handleSaveModalConfig}
                >
                  <Text style={styles.modalBtnSaveText}>Salvar Prescrição</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  contentContainer: {
    padding: THEME.spacing.md,
    paddingBottom: 100,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.sizing.borderRadiusCard,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginLeft: 8,
  },
  sectionDesc: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  activeProfileBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  profileDetail: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  btnDangerOutline: {
    borderWidth: 1.5,
    borderColor: THEME.colors.danger,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDangerOutlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.danger,
  },
  inactiveProfileBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  inactiveTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 8,
    marginBottom: 4,
  },
  inactiveText: {
    fontSize: 14,
    color: '#B45309',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  btnPreset: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'center',
  },
  btnPresetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnShareWhatsapp: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 10,
  },
  btnShareWhatsappText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnExportCsv: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  btnExportCsvText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  privacyItem: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  btnHardReset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    marginTop: 10,
  },
  btnHardResetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalScroll: {
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  radioBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  radioBtnActive: {
    backgroundColor: THEME.colors.primaryLight,
    borderColor: THEME.colors.primary,
  },
  radioBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  radioBtnTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 10,
  },
  modalBtnCancel: {
    backgroundColor: '#E2E8F0',
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  modalBtnSave: {
    backgroundColor: THEME.colors.primary,
  },
  modalBtnSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
