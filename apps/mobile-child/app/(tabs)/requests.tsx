import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { childApi } from '../../src/lib/api';

interface ContentRequest {
  id: string;
  videoTitle: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  parentNote: string | null;
}

const STATUS_CONFIG = {
  pending: { label: 'Waiting...', color: '#F59E0B', bg: '#FFFBEB' },
  approved: { label: 'Approved!', color: '#10B981', bg: '#ECFDF5' },
  denied: { label: 'Not this time', color: '#EF4444', bg: '#FEF2F2' },
};

export default function RequestsScreen() {
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await childApi.getMyRequests({ limit: 50 });
      setRequests(res.data.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void fetchRequests(); }, [fetchRequests]));

  const renderItem = ({ item }: { item: ContentRequest }) => {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;

    return (
      <View style={styles.card}>
        <View style={styles.row}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Text style={{ fontSize: 20 }}>🎬</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>{item.videoTitle}</Text>
            <Text style={styles.channel} numberOfLines={1}>{item.channelName}</Text>
            <Text style={styles.time}>
              {formatDistanceToNow(new Date(item.requestedAt), { addSuffix: true })}
            </Text>
          </View>
        </View>

        <View style={[styles.statusRow, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          {item.status === 'pending' && (
            <Text style={styles.waitText}>Your parent will review this soon</Text>
          )}
          {item.status === 'approved' && (
            <Text style={styles.waitText}>Check your library to watch it!</Text>
          )}
          {item.status === 'denied' && item.parentNote && (
            <Text style={styles.waitText} numberOfLines={2}>{item.parentNote}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Requests</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🙋</Text>
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptyText}>Find a video you like and ask your parent to approve it!</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void fetchRequests(); }}
              tintColor="#6C63FF"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', padding: 12, gap: 12 },
  thumb: { width: 80, height: 52, borderRadius: 8, backgroundColor: '#E5E7EB' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', lineHeight: 18 },
  channel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  time: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  statusText: { fontSize: 12, fontWeight: '700', minWidth: 90 },
  waitText: { fontSize: 12, color: '#6B7280', flex: 1 },
});
