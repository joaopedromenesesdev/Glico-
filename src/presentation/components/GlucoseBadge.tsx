import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getGlucoseStatus } from '../../domain/entities/GlucoseMeasurement';
import { THEME } from '../theme';

interface GlucoseBadgeProps {
  value: number;
  size?: 'normal' | 'large';
}

export const GlucoseBadge: React.FC<GlucoseBadgeProps> = ({ value, size = 'normal' }) => {
  const status = getGlucoseStatus(value);

  const getConfig = () => {
    switch (status) {
      case 'hypo':
        return {
          label: 'Baixa (< 70)',
          bgColor: THEME.colors.hypoBg,
          textColor: THEME.colors.hypoText,
        };
      case 'target':
        return {
          label: 'Na Meta (70-139)',
          bgColor: THEME.colors.targetBg,
          textColor: THEME.colors.targetText,
        };
      case 'elevated':
        return {
          label: 'Atenção (140-179)',
          bgColor: THEME.colors.elevatedBg,
          textColor: THEME.colors.elevatedText,
        };
      case 'high':
        return {
          label: 'Alta (≥ 180)',
          bgColor: THEME.colors.highBg,
          textColor: THEME.colors.highText,
        };
    }
  };

  const config = getConfig();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bgColor },
        size === 'large' && styles.badgeLarge,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.textColor },
          size === 'large' && styles.textLarge,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  textLarge: {
    fontSize: 15,
  },
});
