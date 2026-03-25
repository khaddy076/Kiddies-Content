import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontWeight, spacing, borderRadius } from '../theme.js';

interface ScreenTimeBarProps {
  usedMinutes: number;
  limitMinutes: number;
  showLabel?: boolean;
  height?: number;
}

function getBarColor(pct: number): string {
  if (pct >= 0.9) return colors.error;
  if (pct >= 0.7) return colors.warning;
  return colors.success;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const ScreenTimeBar: React.FC<ScreenTimeBarProps> = ({
  usedMinutes,
  limitMinutes,
  showLabel = true,
  height = 8,
}) => {
  const pct = limitMinutes > 0 ? Math.min(usedMinutes / limitMinutes, 1) : 0;
  const barColor = getBarColor(pct);

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            Screen Time: <Text style={[styles.used, { color: barColor }]}>{formatMinutes(usedMinutes)}</Text>
          </Text>
          <Text style={styles.limit}>/ {formatMinutes(limitMinutes)}</Text>
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct * 100}%`,
              height,
              backgroundColor: barColor,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.remaining}>
          {limitMinutes - usedMinutes > 0
            ? `${formatMinutes(limitMinutes - usedMinutes)} remaining`
            : 'Time limit reached'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  used: {
    fontWeight: fontWeight.semibold,
  },
  limit: {
    fontSize: typography.xs,
    color: colors.textTertiary,
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    minWidth: 4,
  },
  remaining: {
    fontSize: typography.xs,
    color: colors.textTertiary,
  },
});
