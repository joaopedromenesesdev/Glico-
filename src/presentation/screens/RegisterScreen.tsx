import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BloodGlucoseMeasurement,
  MeasurementContext,
} from '../../domain/entities/GlucoseMeasurement';
import { MedicalParametersProfile } from '../../domain/entities/MedicalProfile';
import { calculateInsulinDose } from '../../domain/engines/insulinEngine';
import { THEME } from '../theme';
import { ContextChip } from '../components/ContextChip';
import { BigButton } from '../components/BigButton';
import { GlucoseBadge } from '../components/GlucoseBadge';
import { InsulinCard } from '../components/InsulinCard';
import { formatTimeShort, getRelativeTimeLabel } from '../../core/utils/dateUtils';

interface RegisterScreenProps {
  lastMeasurement: BloodGlucoseMeasurement | null;
  medicalProfile: MedicalParametersProfile | null;
  onSaveMeasurement: (
    measurement: Omit<BloodGlucoseMeasurement, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
  ) => Promise<void>;
  onNavigateToHistory: () => void;
  onNavigateToSettings: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  lastMeasurement,
  medicalProfile,
  onSaveMeasurement,
  onNavigateToHistory,
  onNavigateToSettings,
}) => {
  const [glucoseStr, setGlucoseStr] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<MeasurementContext>('fasting');
  const [notes, setNotes] = useState<string>('');
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [appliedInsulin, setAppliedInsulin] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const glucoseValue = useMemo(() => {
    const parsed = parseInt(glucoseStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [glucoseStr]);

  // Cálculo de insulina determinístico executado dinamicamente
  const insulinResult = useMemo(() => {
    if (glucoseValue === 0) {
      return {
        isApplicable: false,
        calculatedUnits: null,
        rawUnits: null,
        isExceededCap: false,
        maxCapApplied: null,
        ruleTypeApplied: 'none',
        explanation: '',
        warnings: [],
        isBlocked: false,
      };
    }
    return calculateInsulinDose(glucoseValue, medicalProfile);
  }, [glucoseValue, medicalProfile]);

  const handleSave = async () => {
    if (glucoseValue <= 0) {
      const msg = 'Por favor, digite o valor da sua glicemia medido no glicosímetro.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    if (glucoseValue < 20 || glucoseValue > 700) {
      const msg = `O valor de ${glucoseValue} mg/dL parece incomum. Por favor, confira o visor do seu aparelho antes de salvar.`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    try {
      setIsSaving(true);
      await onSaveMeasurement({
        value: glucoseValue,
        measuredAt: new Date().toISOString(),
        context: selectedContext,
        notes: notes.trim() || undefined,
        calculatedInsulinDose: insulinResult.calculatedUnits ?? undefined,
        appliedInsulinDose: appliedInsulin ?? undefined,
        medicalRuleVersionId: medicalProfile?.id,
      });

      // Limpar formulário e mostrar feedback
      setGlucoseStr('');
      setNotes('');
      setShowNotes(false);
      setAppliedInsulin(null);
      setSuccessMessage(`Medição de ${glucoseValue} mg/dL salva com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (error) {
      const msg = 'Ocorreu um erro ao salvar sua medição. Tente novamente.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Erro', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const contexts: MeasurementContext[] = [
    'fasting',
    'pre_meal',
    'post_meal',
    'bedtime',
    'dawn',
    'other',
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Placar de Última Medição */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Última Medição</Text>
          {lastMeasurement && (
            <TouchableOpacity onPress={onNavigateToHistory}>
              <Text style={styles.viewHistoryLink}>Ver Histórico</Text>
            </TouchableOpacity>
          )}
        </View>

        {lastMeasurement ? (
          <View style={styles.lastMeasurementBody}>
            <View style={styles.lastMeasurementValueRow}>
              <Text style={styles.lastMeasurementNumber}>{lastMeasurement.value}</Text>
              <Text style={styles.lastMeasurementUnit}>mg/dL</Text>
              <View style={{ marginLeft: 12 }}>
                <GlucoseBadge value={lastMeasurement.value} />
              </View>
            </View>
            <Text style={styles.lastMeasurementTime}>
              {getRelativeTimeLabel(lastMeasurement.measuredAt)}
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyLastText}>
            Nenhuma medição registrada ainda. Digite sua primeira glicemia abaixo!
          </Text>
        )}
      </View>

      {/* Notificação de Sucesso */}
      {successMessage && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#065F46" />
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      {/* Formulário de Registro Rápido */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Qual a sua glicemia agora?</Text>
        <Text style={styles.sectionSubtitle}>
          Digite o número que apareceu no seu aparelho:
        </Text>

        {/* Input Numérico Grande */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.numericInput}
            keyboardType="number-pad"
            returnKeyType="done"
            value={glucoseStr}
            onChangeText={(txt) => setGlucoseStr(txt.replace(/[^0-9]/g, ''))}
            placeholder="0"
            placeholderTextColor="#94A3B8"
            maxLength={3}
            autoFocus={false}
          />
          <Text style={styles.inputUnit}>mg/dL</Text>
        </View>

        {glucoseValue > 0 && (
          <View style={styles.badgePreviewRow}>
            <GlucoseBadge value={glucoseValue} size="large" />
          </View>
        )}

        {/* Seletor de Contexto */}
        <Text style={[styles.sectionTitle, { marginTop: THEME.spacing.lg }]}>
          Momento da Medição:
        </Text>
        <View style={styles.chipsRow}>
          {contexts.map((ctx) => (
            <ContextChip
              key={ctx}
              context={ctx}
              isSelected={selectedContext === ctx}
              onSelect={setSelectedContext}
            />
          ))}
        </View>

        {/* Card Condicional de Insulina Ultrarrápida */}
        {glucoseValue >= 140 && (
          <InsulinCard
            glucoseValue={glucoseValue}
            result={insulinResult}
            appliedDose={appliedInsulin}
            onUpdateAppliedDose={setAppliedInsulin}
            onNavigateToMedicalSettings={onNavigateToSettings}
          />
        )}

        {/* Observações Opcionais */}
        <TouchableOpacity
          style={styles.notesToggle}
          onPress={() => setShowNotes(!showNotes)}
        >
          <Ionicons
            name={showNotes ? 'chevron-up' : 'add-circle-outline'}
            size={20}
            color={THEME.colors.primary}
          />
          <Text style={styles.notesToggleText}>
            {showNotes ? 'Ocultar anotação' : 'Adicionar anotação (opcional)'}
          </Text>
        </TouchableOpacity>

        {showNotes && (
          <TextInput
            style={styles.notesInput}
            placeholder="Ex: Tontura leve, almoço fora de casa..."
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        )}

        {/* Botão Gigante de Ação */}
        <View style={styles.buttonWrapper}>
          <BigButton
            title="SALVAR MEDIÇÃO"
            onPress={handleSave}
            disabled={glucoseValue <= 0}
            loading={isSaving}
            icon={
              <Ionicons
                name="checkmark"
                size={26}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
            }
          />
        </View>
      </View>
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
    paddingBottom: THEME.spacing.xxl * 2,
  },
  headerCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.sizing.borderRadiusCard,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewHistoryLink: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  lastMeasurementBody: {
    marginTop: 4,
  },
  lastMeasurementValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  lastMeasurementNumber: {
    fontSize: 38,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  lastMeasurementUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginLeft: 6,
  },
  lastMeasurementTime: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  emptyLastText: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  successText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 10,
    flex: 1,
  },
  formCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.sizing.borderRadiusCard,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionTitle: {
    fontSize: THEME.typography.title2,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    marginTop: 8,
  },
  numericInput: {
    fontSize: THEME.typography.heroNumber,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    minWidth: 110,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginLeft: 8,
  },
  badgePreviewRow: {
    alignItems: 'center',
    marginTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  notesToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.primary,
    marginLeft: 6,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: THEME.colors.textPrimary,
    marginTop: 8,
  },
  buttonWrapper: {
    marginTop: 16,
  },
});
