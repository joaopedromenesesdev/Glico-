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
import { CalendarDatePickerModal } from '../components/CalendarDatePickerModal';
import {
  formatTimeShort,
  getRelativeTimeLabel,
  getCurrentTimeFormatted,
  isValidTime,
  subtractMinutesFromNow,
  createIsoFromTime,
  formatDateDisplay,
  isToday as isTodayFn,
  isYesterday as isYesterdayFn,
  createIsoFromDateAndTime,
} from '../../core/utils/dateUtils';

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
  const [measurementTime, setMeasurementTime] = useState<string>(() => getCurrentTimeFormatted());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [appliedInsulin, setAppliedInsulin] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleTimeChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length === 0) {
      setMeasurementTime('');
      return;
    }
    if (clean.length <= 2) {
      setMeasurementTime(clean);
      return;
    }
    const hh = clean.slice(0, 2);
    const mm = clean.slice(2, 4);
    setMeasurementTime(`${hh}:${mm}`);
  };

  const handleTimeBlur = () => {
    if (!measurementTime.trim()) {
      setMeasurementTime(getCurrentTimeFormatted());
      return;
    }
    const clean = measurementTime.replace(/[^0-9]/g, '');
    let h = 0;
    let m = 0;
    if (clean.length === 1 || clean.length === 2) {
      h = parseInt(clean, 10);
      m = 0;
    } else if (clean.length === 3) {
      h = parseInt(clean.slice(0, 1), 10);
      m = parseInt(clean.slice(1, 3), 10);
    } else if (clean.length >= 4) {
      h = parseInt(clean.slice(0, 2), 10);
      m = parseInt(clean.slice(2, 4), 10);
    }

    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      const msg = 'Horário inválido. Por favor, digite um horário entre 00:00 e 23:59.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      setMeasurementTime(getCurrentTimeFormatted());
      return;
    }

    setMeasurementTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const handleSetTimeToNow = () => {
    setMeasurementTime(getCurrentTimeFormatted());
  };

  const handleSubtractMinutes = (mins: number) => {
    setMeasurementTime(subtractMinutesFromNow(mins));
  };

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

    if (!isValidTime(measurementTime)) {
      const msg = 'Por favor, informe um horário válido no formato HH:MM (ex: 14:30).';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    try {
      setIsSaving(true);
      // Usar a data selecionada no calendário + horário digitado
      const measuredAt = isTodayFn(selectedDate)
        ? createIsoFromTime(measurementTime)
        : createIsoFromDateAndTime(selectedDate, measurementTime);
      await onSaveMeasurement({
        value: glucoseValue,
        measuredAt,
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
      setMeasurementTime(getCurrentTimeFormatted());
      setSelectedDate(new Date());
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

        {/* Seletor de Data da Medição */}
        <View style={styles.dateSection}>
          <Text style={[styles.sectionTitle, { marginTop: THEME.spacing.lg }]}>
            Data da Medição:
          </Text>
          <Text style={styles.sectionSubtitle}>
            Selecione o dia em que o teste foi feito:
          </Text>

          <View style={styles.dateDisplay}>
            <Ionicons name="calendar" size={22} color={THEME.colors.primaryDark} style={{ marginRight: 10 }} />
            <Text style={styles.dateDisplayText}>
              {formatDateDisplay(selectedDate)}
            </Text>
          </View>

          <View style={styles.dateQuickBtnsRow}>
            <TouchableOpacity
              style={[
                styles.dateQuickBtn,
                isTodayFn(selectedDate) && styles.dateQuickBtnActive,
              ]}
              onPress={() => setSelectedDate(new Date())}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateQuickBtnText,
                  isTodayFn(selectedDate) && styles.dateQuickBtnTextActive,
                ]}
              >
                Hoje
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateQuickBtn,
                isYesterdayFn(selectedDate) && styles.dateQuickBtnActive,
              ]}
              onPress={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setSelectedDate(y);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateQuickBtnText,
                  isYesterdayFn(selectedDate) && styles.dateQuickBtnTextActive,
                ]}
              >
                Ontem
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateQuickBtn,
                !isTodayFn(selectedDate) && !isYesterdayFn(selectedDate) && styles.dateQuickBtnActive,
              ]}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={
                  !isTodayFn(selectedDate) && !isYesterdayFn(selectedDate)
                    ? '#FFFFFF'
                    : THEME.colors.textSecondary
                }
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.dateQuickBtnText,
                  !isTodayFn(selectedDate) && !isYesterdayFn(selectedDate) && styles.dateQuickBtnTextActive,
                ]}
              >
                Outro dia...
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Input de Horário da Medição */}
        <View style={styles.timeSection}>
          <Text style={[styles.sectionTitle, { marginTop: THEME.spacing.lg }]}>
            Horário da Medição:
          </Text>
          <Text style={styles.sectionSubtitle}>
            Horário em que o teste foi realizado no aparelho:
          </Text>

          <View style={styles.timeControlCard}>
            <View style={styles.timeInputRow}>
              {/* Caixa de Entrada de Horário */}
              <View style={styles.timeInputBox}>
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={THEME.colors.primaryDark}
                  style={styles.timeIcon}
                />
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  value={measurementTime}
                  onChangeText={handleTimeChange}
                  onBlur={handleTimeBlur}
                  placeholder="00:00"
                  placeholderTextColor="#94A3B8"
                  maxLength={5}
                  selectTextOnFocus
                />
              </View>

              {/* Botão Agora */}
              <TouchableOpacity
                style={styles.timeNowBtn}
                onPress={handleSetTimeToNow}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={THEME.colors.primaryDark}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.timeNowBtnText}>Agora</Text>
              </TouchableOpacity>
            </View>

            {/* Presets Rápidos de Horário */}
            <View style={styles.quickPresetsRow}>
              <TouchableOpacity
                style={styles.quickPresetChip}
                onPress={() => handleSubtractMinutes(15)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickPresetText}>-15 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPresetChip}
                onPress={() => handleSubtractMinutes(30)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickPresetText}>-30 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPresetChip}
                onPress={() => handleSubtractMinutes(60)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickPresetText}>-1 hora</Text>
              </TouchableOpacity>
            </View>
          </View>
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

      {/* Modal de Calendário */}
      <CalendarDatePickerModal
        visible={showCalendar}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onClose={() => setShowCalendar(false)}
      />
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
  dateSection: {
    marginTop: 4,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  dateDisplayText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  dateQuickBtnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    marginHorizontal: 3,
  },
  dateQuickBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  dateQuickBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  dateQuickBtnTextActive: {
    color: '#FFFFFF',
  },
  timeSection: {
    marginTop: 4,
  },
  timeControlCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    marginTop: 4,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginRight: 10,
  },
  timeIcon: {
    marginRight: 10,
  },
  timeInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    letterSpacing: 1,
  },
  timeNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  timeNowBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  quickPresetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    marginHorizontal: 3,
  },
  quickPresetText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
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
