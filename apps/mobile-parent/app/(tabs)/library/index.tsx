import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { parentApi } from '../../../src/lib/api';

interface Child {
  id: string;
  name: string;
}

interface LibraryItem {
  id: string;
  videoTitle: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  durationSeconds: number | null;
  watchCount: number;
}

export default function LibraryScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChildren = useCallback(async () => {
    try {
      const res = await parentApi.getChildren();
      const kids: Child[] = res.data.data ?? [];
      setChildren(kids);
      if (kids.length > 0 && !selectedChildId) {
        setSelectedChildId(kids[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoadingChildren(false);
    }
  }, [selectedChildId]);

  const fetchLibrary = useCallback(async () => {
    if (!selectedChildId) return;
    setLoadingLibrary(true);
    try {
      const res = await parentApi.getChildLibrary(selectedChildId, { limit: 100 });
      setLibrary(res.data.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingLibrary(false);
      setRefreshing(false);
    }
  }, [selectedChildId]);

  useFocusEffect(useCallback(() => { void fetchChildren(); }, [fetchChildren]));
  useFocusEffect(useCallback(() => { void fetchLibrary(); }, [fetchLibrary]));

  const handleRemove = (item: LibraryItem) => {
    if (!selectedChildId) return;
    Alert.alert(
      'Remove video?',
      `Remove "${item.videoTitle}" from the library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await parentApi.removeFromLibrary(selectedChildId, item.id);
              setLibrary((prev) => prev.filter((i) => i.id !== item.id));
            } catch {
              Alert.alert('Error', 'Failed to remove video');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  const renderItem = ({ item }: { item: LibraryItem }) => (
    <View style={styles.card}>
      <View style={styles.thumbContainer}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={{ fontSize: 20 }}>🎬</Text>
          </View>
        )}
        {item.durationSeconds && (
          <View style={styles.durBadge}>
            <Text style={styles.durText}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.videoTitle}</Text>
        <Text style={styles.channel} numberOfLines={1}>{item.channelName}</Text>
        {item.watchCount > 0 && (
          <Text style={styles.watchCount}>▶ Watched {item.watchCount}×</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Approved Library</Text>
      </View>

      {/* Child selector */}
      {!loadingChildren && children.length > 1 && (
        <View style={styles.childTabs}>
          {children.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedChildId(c.id)}
              style={[styles.childTab, selectedChildId === c.id && styles.childTabActive]}
            >
              <Text style={[styles.childTabText, selectedChildId === c.id && styles.childTabTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loadingLibrary ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : library.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>📚</Text>
          <Text style={styles.emptyTitle}>Library is empty</Text>
          <Text style={styles.emptyText}>Approve requests to add videos here</Text>
        </View>
      ) : (
        <FlatList
          data={library}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void fetchLibrary(); }}
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
  childTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', gap: 8, flexWrap: 'wrap' },
  childTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
  childTabActive: { backgroundColor: '#6C63FF' },
  childTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  childTabTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  thumbContainer: { position: 'relative' },
  thumb: { width: 96, height: 64, backgroundColor: '#E5E7EB' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  durBadge: { position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 },
  durText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  info: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  title: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', lineHeight: 16 },
  channel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  watchCount: { fontSize: 11, color: '#6C63FF', marginTop: 4, fontWeight: '600' },
  removeBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  removeBtnText: { fontSize: 16, color: '#9CA3AF', fontWeight: '700' },
});
