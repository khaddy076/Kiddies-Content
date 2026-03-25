import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { colors, typography, fontWeight, spacing, borderRadius, shadows } from '../theme.js';
import { Badge } from './Badge.js';

interface ContentCardProps {
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  safetyScore?: number;
  variant?: 'browse' | 'request';
  onPress?: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
  style?: ViewStyle;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getSafetyLabel(score: number): { label: string; variant: 'approved' | 'pending' | 'denied' } {
  if (score >= 0.8) return { label: 'Safe', variant: 'approved' };
  if (score >= 0.6) return { label: 'Moderate', variant: 'pending' };
  return { label: 'Review', variant: 'denied' };
}

export const ContentCard: React.FC<ContentCardProps> = ({
  title,
  channelName,
  thumbnailUrl,
  durationSeconds,
  safetyScore,
  variant = 'browse',
  onPress,
  onApprove,
  onDeny,
  style,
}) => {
  const safetyInfo = safetyScore !== undefined ? getSafetyLabel(safetyScore) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, shadows.md, style]}
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {durationSeconds !== undefined && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(durationSeconds)}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.channel} numberOfLines={1}>
          {channelName}
        </Text>
        {safetyInfo && (
          <Badge label={safetyInfo.label} variant={safetyInfo.variant} />
        )}
      </View>

      {variant === 'request' && (onApprove ?? onDeny) && (
        <View style={styles.actions}>
          {onApprove && (
            <TouchableOpacity
              onPress={onApprove}
              style={[styles.actionBtn, styles.approveBtn]}
            >
              <Text style={styles.actionBtnText}>✓</Text>
            </TouchableOpacity>
          )}
          {onDeny && (
            <TouchableOpacity
              onPress={onDeny}
              style={[styles.actionBtn, styles.denyBtn]}
            >
              <Text style={styles.actionBtnText}>✗</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceSecondary,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: typography.xs,
    fontWeight: fontWeight.medium,
  },
  info: {
    padding: spacing.sm,
    gap: 4,
  },
  title: {
    fontSize: typography.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: 18,
  },
  channel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  approveBtn: {
    backgroundColor: colors.successLight,
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
  },
  denyBtn: {
    backgroundColor: colors.errorLight,
  },
  actionBtnText: {
    fontSize: typography.lg,
    fontWeight: fontWeight.bold,
  },
});
