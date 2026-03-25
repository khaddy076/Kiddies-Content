import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput,
  Alert, RefreshControl, ActivityIndicator, Modal, Animated,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const api = axios.create({ baseURL: `${API_URL}/api/v1` });
api.interceptors.request.use(async (cfg) => {
  const t = await SecureStore.getItemAsync('parent_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

interface Request {
  id: string;
  childName: string;
  videoTitle: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  durationSeconds: number | null;
  aiSafetyScore: number | null;
  childNote: string | null;
  requestedAt: string;
  status: string;
}

export default function RequestsScreen() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [denyModal, setDenyModal] = useState<{ id: string; title: string } | null>(null);
  const [denyNote, setDenyNote] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/parent/requests', { params: { status: 'pending', limit: 50 } });
      setRequests(res.data.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { void fetchRequests(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api.post(`/parent/requests/${id}/approve`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      Alert.alert('Error', 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async () => {
    if (!denyModal) return;
    if (!denyNote.trim()) {
      Alert.alert('Reason required', 'Please explain why you are denying this request');
      return;
    }
    setProcessing(denyModal.id);
    try {
      await api.post(`/parent/requests/${denyModal.id}/deny`, { note: denyNote });
      setRequests((prev) => prev.filter((r) => r.id !== denyModal.id));
      setDenyModal(null);
      setDenyNote('');
    } catch {
      Alert.alert('Error', 'Failed to deny request');
    } finally {
      setProcessing(null);
    }
  };

  const formatDuration = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  const renderRequest = ({ item }: { item: Request }) => {
    const isProcessing = processing === item.id;

    return (
      <View style={styles.requestCard}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={{ fontSize: 24 }}>🎬</Text>
            </View>
          )}
          {item.durationSeconds && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(item.durationSeconds)}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.requestInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.videoTitle}</Text>
          <Text style={styles.channelName}>{item.channelName}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.childBadge}>👦 {item.childName}</Text>
            {item.aiSafetyScore !== null && (
              <Text style={[styles.safetyBadge, { color: item.aiSafetyScore >= 0.8 ? '#10B981' : item.aiSafetyScore >= 0.6 ? '#F59E0B' : '#EF4444' }]}>
                {Math.round(item.aiSafetyScore * 100)}% safe
              </Text>
            )}
          </View>

          <Text style={styles.timeAgo}>{formatDistanceToNow(new Date(item.requestedAt), { addSuffix: true })}</Text>

          {item.childNote && (
            <Text style={styles.childNote}>💬 &ldquo;{item.childNote}&rdquo;</Text>
          )}

          {/* Actions */}
          {!isProcessing ? (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => handleApprove(item.id)}
                style={[styles.actionBtn, styles.approveBtn]}
              >
                <Text style={styles.approveBtnText}>✓ Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDenyModal({ id: item.id, title: item.videoTitle })}
                style={[styles.actionBtn, styles.denyBtn]}
              >
                <Text style={styles.denyBtnText}>✗ Deny</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ActivityIndicator color="#6C63FF" style={{ marginTop: 12 }} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pending Requests</Text>
        <Text style={styles.headerCount}>{requests.length} waiting</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>✅</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtext}>No pending requests from your children</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchRequests(); }} tintColor="#6C63FF" />}
        />
      )}

      {/* Deny modal */}
      <Modal visible={!!denyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Deny Request</Text>
            <Text style={styles.modalSubtitle} numberOfLines={2}>&ldquo;{denyModal?.title}&rdquo;</Text>
            <Text style={styles.modalLabel}>Reason (your child will see this)</Text>
            <TextInput
              value={denyNote}
              onChangeText={setDenyNote}
              placeholder="This content is not appropriate right now..."
              multiline
              numberOfLines={3}
              style={styles.modalInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setDenyModal(null); setDenyNote(''); }} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeny} style={styles.modalConfirmBtn}>
                <Text style={styles.modalConfirmText}>Confirm Deny</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  headerCount: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  requestCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  thumbnailContainer: { position: 'relative' },
  thumbnail: { width: '100%', height: 180, backgroundColor: '#E5E7EB' },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  durationBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  requestInfo: { padding: 16 },
  videoTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', lineHeight: 22 },
  channelName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  childBadge: { fontSize: 12, color: '#374151', fontWeight: '600' },
  safetyBadge: { fontSize: 12, fontWeight: '600' },
  timeAgo: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  childNote: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginTop: 8, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  approveBtn: { backgroundColor: '#10B981' },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  denyBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
  denyBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modalInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#1A1A2E', minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  modalCancelText: { fontWeight: '700', color: '#374151' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#EF4444' },
  modalConfirmText: { fontWeight: '700', color: '#fff' },
});
