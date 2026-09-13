import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BloodGlucoseMeasurement,
  MeasurementContext,
  CONTEXT_LABELS,
} from '../../domain/entities/GlucoseMeasurement';
import { THEME } from '../theme';
import { GlucoseBadge } from '../components/GlucoseBadge';
import { formatDateTime } from '../../core/utils/dateUtils';
import { BigButton } from '../components/BigButton';

interface HistoryScreenProps {
  measurements: BloodGlucoseMeasurement[];
  onDeleteMeasurement: (id: string) => Promise<void>;
  onUpdateMeasurement: (measurement: BloodGlucoseMeasurement) => Promise<void>;
  onNavigateToRegister: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  measurements,
  onDeleteMeasurement,
  onUpdateMeasurement,
  onNavigateToRegister,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<BloodGlucoseMeasurement | null>(null);
  const [editValueStr, setEditValueStr] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  const activeMeasurements = useMemo(() => {
    return measurements
      .filter((m) => !m.isDeleted)
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
  }, [measurements]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return activeMeasurements;
    return activeMeasurements.filter((m) => m.context === selectedFilter);
  }, [activeMeasurements, selectedFilter]);

  const handleDelete = (item: BloodGlucoseMeasurement) => {
    const confirmAction = async () => {
      await onDeleteMeasurement(item.id);
    };

    const title = 'Confirmar Exclusão';
    const message = `Deseja realmente apagar a medição de ${item.value} mg/dL realizada em ${formatDateTime(item.measuredAt)}?`;

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        confirmAction();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: confirmAction },
      ]);
    }
  };

  const handleStartEdit = (item: BloodGlucoseMeasurement) => {
    setEditingItem(item);
    setEditValueStr(String(item.value));
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const newVal = parseInt(editValueStr, 10);
    if (isNaN(newVal) || newVal <= 0) {
      const msg = 'Digite um valor de glicemia válido.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    await onUpdateMeasurement({
      ...editingItem,
      value: newVal,
      notes: editNotes.trim() || undefined,
    });
    setEditingItem(null);
  };

  const filterOptions = [
    { key: 'all', label: 'Todas' },
    { key: 'fasting', label: 'Jejum' },
    { key: 'pre_meal', label: 'Antes Refeição' },
    { key: 'post_meal', label: 'Após Refeição' },
    { key: 'bedtime', label: 'Dormir' },
  ];

  return (
    <View style={styles.container}>
      {/* Barra de Filtros */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterOptions}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.key;
            return (
              <TouchableOpacity
                onPress={() => setSelectedFilter(item.key)}
                style={[
                  styles.filterTab,
                  isSelected ? styles.filterTabActive : styles.filterTabInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected ? styles.filterTabTextActive : styles.filterTabTextInactive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: THEME.spacing.md }}
        />
      </View>

      {/* Lista de Medições */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Nenhuma medição encontrada</Text>
          <Text style={styles.emptySubtitle}>
            {selectedFilter === 'all'
              ? 'Toque no botão abaixo para registrar a primeira glicemia.'
              : 'Nenhuma medição para o filtro selecionado.'}
          </Text>
          <BigButton
            title="NOVA MEDIÇÃO"
            onPress={onNavigateToRegister}
            style={{ marginTop: 24, paddingHorizontal: 32 }}
          />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const contextInfo = CONTEXT_LABELS[item.context];
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.contextBadge}>
                    <Ionicons
                      name={contextInfo?.icon as any || 'ellipse'}
                      size={16}
                      color={THEME.colors.primaryDark}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.contextText}>{contextInfo?.label || item.context}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDateTime(item.measuredAt)}</Text>
                </View>

                <View style={styles.cardMainRow}>
                  <View style={styles.valueGroup}>
                    <Text style={styles.valueNumber}>{item.value}</Text>
                    <Text style={styles.valueUnit}>mg/dL</Text>
                    <View style={{ marginLeft: 12 }}>
                      <GlucoseBadge value={item.value} />
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleStartEdit(item)}
                    >
                      <Ionicons name="pencil" size={20} color={THEME.colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionIconBtn, { marginLeft: 12 }]}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash-outline" size={20} color={THEME.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                {item.appliedInsulinDose && item.appliedInsulinDose > 0 ? (
                  <View style={styles.insulinBadgeRow}>
                    <Ionicons name="medkit" size={16} color={THEME.colors.primaryDark} />
                    <Text style={styles.insulinBadgeText}>
                      Insulina aplicada: <Text style={{ fontWeight: '700' }}>{item.appliedInsulinDose} UI</Text>
                    </Text>
                  </View>
                ) : null}

                {item.notes ? (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>Obs: {item.notes}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}

      {/* Modal de Edição */}
      <Modal
        visible={editingItem !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Medição</Text>

            <Text style={styles.inputLabel}>Valor da Glicemia (mg/dL):</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={editValueStr}
              onChangeText={(txt) => setEditValueStr(txt.replace(/[^0-9]/g, ''))}
            />

            <Text style={styles.inputLabel}>Observação:</Text>
            <TextInput
              style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
              multiline
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Ex: Tontura, caminhada..."
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.modalBtnSaveText}>Salvar Alteração</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  filterBar: {
    backgroundColor: THEME.colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: THEME.colors.primary,
  },
  filterTabInactive: {
    backgroundColor: '#F1F5F9',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabTextInactive: {
    color: THEME.colors.textSecondary,
  },
  listContent: {
    padding: THEME.spacing.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.sizing.borderRadiusCard,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  contextText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  dateText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  cardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  valueUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    padding: 8,
  },
  insulinBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  insulinBadgeText: {
    fontSize: 13,
    color: THEME.colors.primaryDark,
    marginLeft: 6,
  },
  notesContainer: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  notesText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 10,
  },
  modalBtnCancel: {
    backgroundColor: '#E2E8F0',
  },
  modalBtnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  modalBtnSave: {
    backgroundColor: THEME.colors.primary,
  },
  modalBtnSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
