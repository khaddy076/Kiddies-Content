import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, Image,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { parentApi } from '../../src/lib/api';

interface VideoResult {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds: number;
  safetyScore: number;
}

export default function ContentSearchScreen() {
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await parentApi.searchContent(query.trim(), { safeSearch: 'strict' });
      setResults(res.data.data ?? []);
    } catch {
      Alert.alert('Error', 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreApprove = async (video: VideoResult) => {
    if (!childId) {
      Alert.alert('Select a child', 'Go to the child profile to pre-approve videos.');
      return;
    }
    setApproving(video.videoId);
    try {
      await parentApi.preApprove(childId, video.videoId);
      Alert.alert('Pre-approved!', `"${video.title}" has been added to your child's library.`);
      setResults((prev) => prev.filter((v) => v.videoId !== video.videoId));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      Alert.alert('Error', e.response?.data?.error?.message ?? 'Failed to pre-approve');
    } finally {
      setApproving(null);
    }
  };

  const formatDuration = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  const renderItem = ({ item }: { item: VideoResult }) => {
    const safeColor = item.safetyScore >= 0.8 ? '#10B981' : item.safetyScore >= 0.6 ? '#F59E0B' : '#EF4444';
    const isApproving = approving === item.videoId;

    return (
      <View style={styles.card}>
        <View style={styles.thumbContainer}>
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
          <View style={styles.durBadge}>
            <Text style={styles.durText}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.channel}>{item.channelName}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.safetyBadge, { color: safeColor }]}>
              {Math.round(item.safetyScore * 100)}% safe
            </Text>
          </View>
          {childId ? (
            <TouchableOpacity
              style={[styles.approveBtn, isApproving && styles.approveBtnDisabled]}
              onPress={() => handlePreApprove(item)}
              disabled={isApproving}
            >
              {isApproving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.approveBtnText}>+ Add to Library</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Videos</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for kids content..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoFocus
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>
      ) : results.length === 0 && query ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 36 }}>🔍</Text>
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.videoId}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: '#6C63FF', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  searchBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', gap: 8 },
  searchInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A2E' },
  searchBtn: { backgroundColor: '#6C63FF', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  thumbContainer: { position: 'relative' },
  thumb: { width: '100%', height: 160 },
  durBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  durText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  info: { padding: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', lineHeight: 20 },
  channel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: 6 },
  safetyBadge: { fontSize: 12, fontWeight: '700' },
  approveBtn: { backgroundColor: '#6C63FF', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  approveBtnDisabled: { opacity: 0.6 },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
