import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { parentApi } from '../../../src/lib/api';

interface ChildDetail {
  id: string;
  name: string;
  ageGroup: string;
  screenTimeLimitMinutes: number;
  isActive: boolean;
  isPaused: boolean;
}

interface ScreenTime {
  todayMinutes: number;
  limitMinutes: number;
  percentage: number;
}

export default function ChildDetailScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const router = useRouter();
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [screenTime, setScreenTime] = useState<ScreenTime | null>(null);
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!childId) return;
    try {
      const [childRes, stRes] = await Promise.all([
        parentApi.getChild(childId),
        parentApi.getChildScreenTime(childId),
      ]);
      setChild(childRes.data.data);
      setScreenTime(stRes.data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useFocusEffect(useCallback(() => { void fetchData(); }, [fetchData]));

  const handleTogglePause = async () => {
    if (!child) return;
    const action = child.isPaused ? 'resume' : 'pause';
    Alert.alert(
      child.isPaused ? 'Resume Screen Time?' : 'Pause Screen Time?',
      child.isPaused
        ? `${child.name} will be able to watch videos again.`
        : `${child.name} won't be able to watch any videos until you resume.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'pause' ? 'Pause' : 'Resume',
          style: action === 'pause' ? 'destructive' : 'default',
          onPress: async () => {
            setPausing(true);
            try {
              await parentApi.updateChild(child.id, { isPaused: !child.isPaused });
              setChild((prev) => prev ? { ...prev, isPaused: !prev.isPaused } : prev);
            } catch {
              Alert.alert('Error', 'Failed to update screen time.');
            } finally {
              setPausing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>;
  }

  if (!child) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Child not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = child.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const stPct = screenTime ? Math.min(screenTime.percentage, 100) : 0;
  const barColor = stPct >= 90 ? '#EF4444' : stPct >= 70 ? '#F59E0B' : '#10B981';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{child.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.childName}>{child.name}</Text>
        <Text style={styles.childMeta}>{child.ageGroup.replace('_', '–')} years</Text>
        {child.isPaused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedText}>⏸ Screen time paused</Text>
          </View>
        )}
      </View>

      {/* Screen time */}
      {screenTime && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Screen Time</Text>
          <View style={styles.stRow}>
            <Text style={styles.stUsed}>{screenTime.todayMinutes}m</Text>
            <Text style={styles.stLimit}>of {screenTime.limitMinutes}m</Text>
          </View>
          <View style={styles.stBarBg}>
            <View style={[styles.stBarFill, { width: `${stPct}%` as `${number}%`, backgroundColor: barColor }]} />
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Controls</Text>
        <TouchableOpacity
          style={[styles.actionBtn, child.isPaused ? styles.resumeBtn : styles.pauseBtn]}
          onPress={handleTogglePause}
          disabled={pausing}
        >
          {pausing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionBtnText}>
              {child.isPaused ? '▶ Resume Screen Time' : '⏸ Pause Screen Time'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => router.push(`/content/search?childId=${childId}`)}
        >
          <Text style={styles.outlineBtnText}>🔍 Search & Pre-approve Videos</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Daily limit</Text>
          <Text style={styles.infoValue}>{child.screenTimeLimitMinutes} minutes</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, { color: child.isActive ? '#10B981' : '#9CA3AF' }]}>
            {child.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
  backBtn: { backgroundColor: '#6C63FF', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backLink: { width: 60 },
  backLinkText: { fontSize: 15, color: '#6C63FF', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  profileSection: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff', marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  childName: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  childMeta: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  pausedBadge: { backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 },
  pausedText: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  stRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  stUsed: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  stLimit: { fontSize: 14, color: '#6B7280' },
  stBarBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  stBarFill: { height: 10, borderRadius: 5 },
  actionBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  pauseBtn: { backgroundColor: '#F59E0B' },
  resumeBtn: { backgroundColor: '#10B981' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  outlineBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#6C63FF' },
  outlineBtnText: { color: '#6C63FF', fontWeight: '700', fontSize: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
});
