import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InsulinCalculationResult } from '../../domain/engines/insulinEngine';
import { THEME } from '../theme';

interface InsulinCardProps {
  glucoseValue: number;
  result: InsulinCalculationResult;
  appliedDose: number | null;
  onUpdateAppliedDose: (dose: number | null) => void;
  onNavigateToMedicalSettings?: () => void;
}

export const InsulinCard: React.FC<InsulinCardProps> = ({
  glucoseValue,
  result,
  appliedDose,
  onUpdateAppliedDose,
  onNavigateToMedicalSettings,
}) => {
  // Se o cálculo não for aplicável (< 140) e não estiver bloqueado, não exibe
  if (!result.isApplicable && !result.isBlocked) {
    return null;
  }

  // Caso 1: Bloqueado por ausência de parâmetros médicos prescritos
  if (result.isBlocked) {
    return (
      <View style={[styles.card, styles.cardBlocked]}>
        <View style={styles.header}>
          <Ionicons name="information-circle-outline" size={24} color="#0369A1" />
          <Text style={styles.titleBlocked}>Acompanhamento Médico</Text>
        </View>
        <Text style={styles.textBlocked}>
          Sua glicemia está em <Text style={{ fontWeight: '700' }}>{glucoseValue} mg/dL</Text>.
          O cálculo de insulina ultrarrápida está desativado porque os parâmetros prescritos pelo seu médico ainda não foram configurados.
        </Text>
        {onNavigateToMedicalSettings && (
          <TouchableOpacity
            style={styles.btnConfigure}
            onPress={onNavigateToMedicalSettings}
          >
            <Text style={styles.btnConfigureText}>Configurar Parâmetros Médicos</Text>
            <Ionicons name="chevron-forward" size={16} color={THEME.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Caso 2: Cálculo ativo com parâmetros configurados
  return (
    <View style={[styles.card, styles.cardActive]}>
      <View style={styles.header}>
        <Ionicons name="medkit" size={24} color={THEME.colors.primaryDark} />
        <Text style={styles.titleActive}>Suporte de Insulina Ultrarrápida</Text>
      </View>

      <View style={styles.doseRow}>
        <View>
          <Text style={styles.doseLabel}>Dose Sugerida pelo Plano:</Text>
          <Text style={styles.doseValue}>
            {result.calculatedUnits !== null ? `${result.calculatedUnits} UI` : '--'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.applyButton,
            appliedDose !== null ? styles.applyButtonActive : styles.applyButtonOutline,
          ]}
          onPress={() => {
            if (appliedDose === null && result.calculatedUnits !== null) {
              onUpdateAppliedDose(result.calculatedUnits);
            } else {
              onUpdateAppliedDose(null);
            }
          }}
        >
          <Ionicons
            name={appliedDose !== null ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={20}
            color={appliedDose !== null ? '#FFFFFF' : THEME.colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.applyButtonText,
              appliedDose !== null ? { color: '#FFFFFF' } : { color: THEME.colors.primary },
            ]}
          >
            {appliedDose !== null ? 'Dose Aplicada' : 'Confirmar Aplicação'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.explanationText}>{result.explanation}</Text>

      {result.warnings.length > 0 && (
        <View style={styles.warningContainer}>
          {result.warnings.map((w, idx) => (
            <Text key={idx} style={styles.warningText}>
              ⚠️ {w}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.legalNotice}>
        * Sempre verifique a orientação do seu médico antes de administrar qualquer medicamento.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: THEME.sizing.borderRadiusCard,
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.sm,
    borderWidth: 1,
  },
  cardBlocked: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  cardActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleBlocked: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
    marginLeft: 8,
  },
  titleActive: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
    marginLeft: 8,
  },
  textBlocked: {
    fontSize: 15,
    color: '#0C4A6E',
    lineHeight: 22,
  },
  btnConfigure: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  btnConfigureText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginRight: 4,
  },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  doseLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  doseValue: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  applyButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  applyButtonActive: {
    backgroundColor: THEME.colors.primary,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  warningContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 18,
  },
  legalNotice: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
