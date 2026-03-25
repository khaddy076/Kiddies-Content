import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { parentApi } from '../../../src/lib/api';

interface Child {
  id: string;
  name: string;
  ageGroup: string;
  screenTimeLimitMinutes: number;
  isActive: boolean;
}

export default function ChildrenScreen() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', dateOfBirth: '', pin: '', screenTimeLimitMinutes: '60' });

  const fetchChildren = useCallback(async () => {
    try {
      const res = await parentApi.getChildren();
      setChildren(res.data.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void fetchChildren(); }, [fetchChildren]));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.dateOfBirth.trim() || form.pin.length < 4) {
      Alert.alert('Missing fields', 'Name, date of birth, and a 4-digit PIN are required.');
      return;
    }
    setCreating(true);
    try {
      await parentApi.createChild({
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        pin: form.pin,
        screenTimeLimitMinutes: parseInt(form.screenTimeLimitMinutes, 10) || 60,
      });
      setShowCreate(false);
      setForm({ name: '', dateOfBirth: '', pin: '', screenTimeLimitMinutes: '60' });
      void fetchChildren();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      Alert.alert('Error', e.response?.data?.error?.message ?? 'Failed to create child profile');
    } finally {
      setCreating(false);
    }
  };

  const getAgeLabel = (group: string) => group.replace('_', '–') + ' yrs';

  const renderChild = ({ item }: { item: Child }) => {
    const initials = item.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(tabs)/children/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.childName}>{item.name}</Text>
          <Text style={styles.childMeta}>{getAgeLabel(item.ageGroup)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.screenTime}>{item.screenTimeLimitMinutes}m/day</Text>
          <View style={[styles.dot, { backgroundColor: item.isActive ? '#10B981' : '#9CA3AF' }]} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Children</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : children.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>👶</Text>
          <Text style={styles.emptyTitle}>No children yet</Text>
          <Text style={styles.emptyText}>Add your first child to get started</Text>
          <TouchableOpacity style={styles.createFirstBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.createFirstBtnText}>Create Child Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={children}
          renderItem={renderChild}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void fetchChildren(); }}
              tintColor="#6C63FF"
            />
          }
        />
      )}

      {/* Create child modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Child Profile</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Child's name *</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                placeholder="Emma"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Date of birth * (YYYY-MM-DD)</Text>
              <TextInput
                value={form.dateOfBirth}
                onChangeText={(v) => setForm((p) => ({ ...p, dateOfBirth: v }))}
                placeholder="2018-05-12"
                keyboardType="numbers-and-punctuation"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>PIN (4 digits) *</Text>
              <TextInput
                value={form.pin}
                onChangeText={(v) => setForm((p) => ({ ...p, pin: v.replace(/\D/g, '').slice(0, 6) }))}
                placeholder="1234"
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Daily screen time limit (minutes)</Text>
              <TextInput
                value={form.screenTimeLimitMinutes}
                onChangeText={(v) => setForm((p) => ({ ...p, screenTimeLimitMinutes: v.replace(/\D/g, '') }))}
                placeholder="60"
                keyboardType="numeric"
                style={styles.modalInput}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setForm({ name: '', dateOfBirth: '', pin: '', screenTimeLimitMinutes: '60' }); }}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} style={styles.modalConfirmBtn} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>Create</Text>}
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
  addBtn: { backgroundColor: '#6C63FF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  createFirstBtn: { backgroundColor: '#6C63FF', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  createFirstBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  info: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  childMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  screenTime: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  modalCancelText: { fontWeight: '700', color: '#374151' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#6C63FF' },
  modalConfirmText: { fontWeight: '700', color: '#fff' },
});
