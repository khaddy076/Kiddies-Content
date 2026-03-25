import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontWeight, spacing, borderRadius } from '../theme.js';
import type { ContentRequestStatus } from '@kiddies/types';

type BadgeVariant = ContentRequestStatus | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
  pending: { bg: colors.warningLight, text: colors.warning },
  approved: { bg: colors.successLight, text: colors.success },
  denied: { bg: colors.errorLight, text: colors.error },
  expired: { bg: '#F3F4F6', text: colors.textSecondary },
  info: { bg: '#EEF2FF', text: colors.primary },
  default: { bg: colors.surfaceSecondary, text: colors.textSecondary },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'sm' }) => {
  const config = variantConfig[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg },
        size === 'md' && styles.containerMd,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.text },
          size === 'md' && styles.textMd,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  containerMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontSize: typography.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  textMd: {
    fontSize: typography.sm,
  },
});
