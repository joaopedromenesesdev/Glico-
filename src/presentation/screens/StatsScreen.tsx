import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BloodGlucoseMeasurement } from '../../domain/entities/GlucoseMeasurement';
import { calculateEstimatedHbA1c } from '../../domain/engines/hba1cEngine';
import { THEME } from '../theme';
import { formatDateShort } from '../../core/utils/dateUtils';

interface StatsScreenProps {
  measurements: BloodGlucoseMeasurement[];
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ measurements }) => {
  const [selectedDays, setSelectedDays] = useState<number>(30);

  const activeMeasurements = useMemo(() => {
    return measurements.filter((m) => !m.isDeleted);
  }, [measurements]);

  // Filtrar pelo período selecionado
  const filtered = useMemo(() => {
    if (selectedDays === 0) return activeMeasurements; // Tudo
    const cutoff = new Date().getTime() - selectedDays * 24 * 60 * 60 * 1000;
    return activeMeasurements.filter((m) => new Date(m.measuredAt).getTime() >= cutoff);
  }, [activeMeasurements, selectedDays]);

  // Cálculo das métricas básicas
  const stats = useMemo(() => {
    if (filtered.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0, targetPercent: 0 };
    }
    const values = filtered.map((m) => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const inTargetCount = values.filter((v) => v >= 70 && v <= 139).length;
    const targetPercent = Math.round((inTargetCount / values.length) * 100);

    return { avg, min, max, count: values.length, targetPercent };
  }, [filtered]);

  // Cálculo da estimativa de HbA1c (ADAG)
  const hba1c = useMemo(() => {
    return calculateEstimatedHbA1c(filtered, selectedDays);
  }, [filtered, selectedDays]);

  // Agrupamento dos últimos dias para gráfico de barras simples e intuitivo
  const dailyAverages = useMemo(() => {
    const map: Record<string, { sum: number; count: number; date: string }> = {};
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
    );

    sorted.forEach((m) => {
      const key = m.measuredAt.split('T')[0];
      if (!map[key]) {
        map[key] = { sum: 0, count: 0, date: m.measuredAt };
      }
      map[key].sum += m.value;
      map[key].count += 1;
    });

    const entries = Object.values(map);
    // Pegar até os últimos 10 dias registrados
    return entries.slice(-10).map((item) => ({
      dateLabel: formatDateShort(item.date),
      avg: Math.round(item.sum / item.count),
    }));
  }, [filtered]);

  const periods = [
    { label: '7 dias', days: 7 },
    { label: '14 dias', days: 14 },
    { label: '30 dias', days: 30 },
    { label: '90 dias', days: 90 },
    { label: 'Tudo', days: 0 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Seletor de Período */}
      <View style={styles.periodRow}>
        {periods.map((p) => {
          const isSelected = selectedDays === p.days;
          return (
            <TouchableOpacity
              key={p.days}
              style={[styles.periodBtn, isSelected && styles.periodBtnActive]}
              onPress={() => setSelectedDays(p.days)}
            >
              <Text
                style={[styles.periodBtnText, isSelected && styles.periodBtnTextActive]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Grid de Cartões de Métricas */}
      <View style={styles.grid}>
        <View style={[styles.metricCard, { borderLeftColor: THEME.colors.primary }]}>
          <Text style={styles.metricLabel}>Média Glicêmica</Text>
          <Text style={styles.metricValue}>
            {stats.count > 0 ? `${stats.avg} mg/dL` : '--'}
          </Text>
          <Text style={styles.metricSub}>{stats.count} medições no período</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: THEME.colors.target }]}>
          <Text style={styles.metricLabel}>Na Meta (70-139)</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.targetText }]}>
            {stats.count > 0 ? `${stats.targetPercent}%` : '--'}
          </Text>
          <Text style={styles.metricSub}>Leituras na faixa ideal</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: THEME.colors.hypo }]}>
          <Text style={styles.metricLabel}>Menor Leitura</Text>
          <Text style={styles.metricValue}>
            {stats.count > 0 ? `${stats.min} mg/dL` : '--'}
          </Text>
          <Text style={styles.metricSub}>Valor mais baixo</Text>
        </View>

        <View style={[styles.metricCard, { borderLeftColor: THEME.colors.high }]}>
          <Text style={styles.metricLabel}>Maior Leitura</Text>
          <Text style={styles.metricValue}>
            {stats.count > 0 ? `${stats.max} mg/dL` : '--'}
          </Text>
          <Text style={styles.metricSub}>Pico mais alto</Text>
        </View>
      </View>

      {/* Gráfico de Evolução Simplificado */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="stats-chart" size={20} color={THEME.colors.primaryDark} />
          <Text style={styles.cardTitle}>Evolução Recente (Médias Diárias)</Text>
        </View>

        {dailyAverages.length === 0 ? (
          <Text style={styles.emptyChartText}>
            Sem dados suficientes para exibir o gráfico de evolução neste período.
          </Text>
        ) : (
          <View style={styles.chartWrapper}>
            <View style={styles.chartBarsRow}>
              {dailyAverages.map((item, idx) => {
                // Altura da barra proporcional (escala 0 a 300)
                const heightPercent = Math.min(100, Math.max(15, (item.avg / 280) * 100));
                const isTarget = item.avg >= 70 && item.avg <= 139;
                return (
                  <View key={idx} style={styles.barColumn}>
                    <Text style={styles.barValueText}>{item.avg}</Text>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor: isTarget
                            ? THEME.colors.target
                            : item.avg < 70
                            ? THEME.colors.hypo
                            : THEME.colors.high,
                        },
                      ]}
                    />
                    <Text style={styles.barDateText}>{item.dateLabel}</Text>
                  </View>
                );
              })}
            </View>

            {/* Legenda do Gráfico */}
            <View style={styles.chartLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: THEME.colors.target }]} />
                <Text style={styles.legendText}>Meta (70-139)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: THEME.colors.high }]} />
                <Text style={styles.legendText}>Acima de 140</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Card Científico de Estimativa de HbA1c (ADAG) */}
      <View style={[styles.card, styles.hba1cCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="analytics" size={22} color="#4338CA" />
          <Text style={[styles.cardTitle, { color: '#312E81' }]}>
            Estimativa de Hemoglobina Glicada (HbA1c)
          </Text>
        </View>

        {hba1c.confidenceLevel === 'insufficient_data' ? (
          <View style={styles.hba1cInsufficient}>
            <Ionicons name="information-circle-outline" size={24} color="#6366F1" />
            <Text style={styles.hba1cInsufficientText}>{hba1c.statusMessage}</Text>
          </View>
        ) : (
          <View style={styles.hba1cResultContainer}>
            <View style={styles.hba1cNumbersRow}>
              <View>
                <Text style={styles.hba1cNumber}>
                  {hba1c.estimatedHbA1cPercent}%
                </Text>
                <Text style={styles.hba1cUnit}>
                  ({hba1c.estimatedHbA1cIfccMmol} mmol/mol IFCC)
                </Text>
              </View>

              <View
                style={[
                  styles.confidenceTag,
                  hba1c.confidenceLevel === 'reliable'
                    ? styles.confidenceReliable
                    : styles.confidencePreliminary,
                ]}
              >
                <Text
                  style={[
                    styles.confidenceTagText,
                    hba1c.confidenceLevel === 'reliable'
                      ? { color: '#065F46' }
                      : { color: '#92400E' },
                  ]}
                >
                  {hba1c.confidenceLevel === 'reliable'
                    ? '✓ Boa Representatividade'
                    : '⚡ Estimativa Preliminar'}
                </Text>
              </View>
            </View>

            <Text style={styles.hba1cStatusText}>{hba1c.statusMessage}</Text>

            <View style={styles.methodologyBox}>
              <Text style={styles.methodologyTitle}>Metodologia Científica ADAG:</Text>
              <Text style={styles.methodologyFormula}>
                HbA1c (%) = (Glicemia Média {hba1c.averageGlucoseMgDl} mg/dL + 46.7) / 28.7
              </Text>
            </View>
          </View>
        )}

        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>⚠️ {hba1c.disclaimer}</Text>
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
    paddingBottom: 100,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: THEME.spacing.md,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  periodBtnTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: THEME.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.sizing.borderRadiusCard,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginLeft: 8,
  },
  emptyChartText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  chartWrapper: {
    marginTop: 8,
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  barFill: {
    width: 14,
    borderRadius: 6,
  },
  barDateText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 6,
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  hba1cCard: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  hba1cInsufficient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
  },
  hba1cInsufficientText: {
    fontSize: 14,
    color: '#4338CA',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  hba1cResultContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginVertical: 6,
  },
  hba1cNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hba1cNumber: {
    fontSize: 40,
    fontWeight: '900',
    color: '#4338CA',
  },
  hba1cUnit: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  confidenceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  confidenceReliable: {
    backgroundColor: '#D1FAE5',
  },
  confidencePreliminary: {
    backgroundColor: '#FEF3C7',
  },
  confidenceTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  hba1cStatusText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  methodologyBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  methodologyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  methodologyFormula: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  disclaimerContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
});
