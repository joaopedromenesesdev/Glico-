import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import {
  isSameDay,
  isToday,
  getDaysInMonth,
  getFirstDayOfWeek,
  getMonthName,
} from '../../core/utils/dateUtils';

interface CalendarDatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarDatePickerModal: React.FC<CalendarDatePickerModalProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  // Reset view when modal opens
  React.useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [visible, selectedDate]);

  const today = useMemo(() => new Date(), [visible]);

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const cells: (Date | null)[] = [];

    // Espaços vazios antes do primeiro dia
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }

    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

    // Não permitir navegar para meses futuros
    const firstOfNext = new Date(nextYear, nextMonth, 1);
    if (firstOfNext > today) return;

    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const handleSelectDay = (date: Date) => {
    // Bloquear datas futuras
    if (date > today && !isSameDay(date, today)) return;
    onSelectDate(date);
    onClose();
  };

  const handleSelectToday = () => {
    onSelectDate(new Date());
    onClose();
  };

  const isNextMonthDisabled = useMemo(() => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    return new Date(nextYear, nextMonth, 1) > today;
  }, [viewYear, viewMonth, today]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <Text style={styles.title}>📅 Escolher Data</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={28} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Botão Rápido - Hoje */}
          <TouchableOpacity style={styles.todayButton} onPress={handleSelectToday} activeOpacity={0.7}>
            <Ionicons name="today" size={20} color={THEME.colors.primaryDark} style={{ marginRight: 8 }} />
            <Text style={styles.todayButtonText}>Selecionar Hoje</Text>
          </TouchableOpacity>

          {/* Navegação de Mês */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.monthNavBtn}
              activeOpacity={0.6}
            >
              <Ionicons name="chevron-back" size={24} color={THEME.colors.primaryDark} />
            </TouchableOpacity>

            <Text style={styles.monthLabel}>
              {getMonthName(viewMonth)} {viewYear}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.monthNavBtn, isNextMonthDisabled && styles.monthNavBtnDisabled]}
              activeOpacity={isNextMonthDisabled ? 1 : 0.6}
              disabled={isNextMonthDisabled}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={isNextMonthDisabled ? '#CBD5E1' : THEME.colors.primaryDark}
              />
            </TouchableOpacity>
          </View>

          {/* Cabeçalho dos dias da semana */}
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} style={styles.weekdayCell}>
                <Text style={styles.weekdayText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Grid de Dias */}
          <ScrollView style={styles.daysScrollView} contentContainerStyle={styles.daysContainer}>
            <View style={styles.daysGrid}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const isFuture = date > today && !isSameDay(date, today);
                const isSelected = isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);

                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isTodayDate && !isSelected && styles.dayCellToday,
                      isFuture && styles.dayCellDisabled,
                    ]}
                    onPress={() => handleSelectDay(date)}
                    disabled={isFuture}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isTodayDate && !isSelected && styles.dayTextToday,
                        isFuture && styles.dayTextDisabled,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Botão Confirmar (redundante com seleção, mas reforça acessibilidade) */}
          <TouchableOpacity style={styles.confirmBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.confirmBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: THEME.spacing.md,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryLight,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 16,
  },
  todayButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  monthNavBtnDisabled: {
    backgroundColor: '#FAFBFC',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  daysScrollView: {
    maxHeight: 320,
  },
  daysContainer: {
    paddingBottom: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%', // 100% / 7
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCellSelected: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 999,
  },
  dayCellToday: {
    backgroundColor: '#F0FDFA',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 17,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextToday: {
    color: THEME.colors.primaryDark,
    fontWeight: '800',
  },
  dayTextDisabled: {
    color: '#CBD5E1',
  },
  confirmBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
});
