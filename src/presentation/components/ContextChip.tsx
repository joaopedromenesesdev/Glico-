import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MeasurementContext, CONTEXT_LABELS } from '../../domain/entities/GlucoseMeasurement';
import { THEME } from '../theme';

interface ContextChipProps {
  context: MeasurementContext;
  isSelected: boolean;
  onSelect: (context: MeasurementContext) => void;
}

export const ContextChip: React.FC<ContextChipProps> = ({
  context,
  isSelected,
  onSelect,
}) => {
  const item = CONTEXT_LABELS[context];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onSelect(context)}
      style={[
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipUnselected,
      ]}
    >
      <Ionicons
        name={item.icon as any}
        size={20}
        color={isSelected ? '#FFFFFF' : THEME.colors.primaryDark}
        style={{ marginRight: 6 }}
      />
      <Text
        style={[
          styles.text,
          isSelected ? styles.textSelected : styles.textUnselected,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    height: 48,
    borderRadius: THEME.sizing.borderRadiusPill,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  chipSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  chipUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: THEME.colors.border,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  textSelected: {
    color: '#FFFFFF',
  },
  textUnselected: {
    color: THEME.colors.textPrimary,
  },
});
