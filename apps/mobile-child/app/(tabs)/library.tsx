import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { childApi } from '../../src/lib/api';

interface LibraryItem {
  id: string;
  videoTitle: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  durationSeconds: number | null;
  approvedAt: string;
  watchCount: number;
}

export default function LibraryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filtered, setFiltered] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await childApi.getLibrary({ limit: 100 });
      const data: LibraryItem[] = res.data.data ?? [];
      setItems(data);
      setFiltered(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void fetchLibrary(); }, [fetchLibrary]));

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFiltered(items);
    } else {
      const q = text.toLowerCase();
      setFiltered(items.filter((i) =>
        i.videoTitle.toLowerCase().includes(q) ||
        (i.channelName ?? '').toLowerCase().includes(q)
      ));
    }
  };

  const formatDuration = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  const renderItem = ({ item }: { item: LibraryItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/watch/${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.thumbContainer}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🎬</Text>
          </View>
        )}
        {item.durationSeconds && (
          <View style={styles.durBadge}>
            <Text style={styles.durText}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        )}
        {item.watchCount > 0 && (
          <View style={styles.watchBadge}>
            <Text style={styles.watchText}>▶ {item.watchCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.videoTitle}</Text>
        <Text style={styles.channel} numberOfLines={1}>{item.channelName}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Library</Text>
        <Text style={styles.headerCount}>{items.length} videos</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder="Search your library..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>📚</Text>
          <Text style={styles.emptyTitle}>
            {search ? 'No videos found' : 'Your library is empty'}
          </Text>
          <Text style={styles.emptyText}>
            {search ? 'Try a different search' : 'Ask a parent to approve some videos for you!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  headerCount: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
  searchInput: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A2E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  grid: { padding: 12, paddingBottom: 32 },
  row: { justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  thumbContainer: { position: 'relative' },
  thumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#E5E7EB' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  durBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  durText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  watchBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: 'rgba(108,99,255,0.85)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  watchText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  info: { padding: 8 },
  title: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', lineHeight: 16 },
  channel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
