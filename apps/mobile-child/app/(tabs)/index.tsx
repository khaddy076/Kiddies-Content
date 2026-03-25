import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth.store';
import { childApi } from '../../src/lib/api';

const CATEGORIES = [
  { label: 'Animals', emoji: '🐾' },
  { label: 'Science', emoji: '🔬' },
  { label: 'Music', emoji: '🎵' },
  { label: 'Stories', emoji: '📖' },
  { label: 'Math', emoji: '🔢' },
  { label: 'Art', emoji: '🎨' },
  { label: 'Nature', emoji: '🌿' },
  { label: 'Cooking', emoji: '👩‍🍳' },
];

interface ContentItem {
  id: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds: number;
  platformContentId: string;
}

interface ScreenTime {
  used: number;
  limit: number;
  remaining: number;
}

export default function HomeScreen() {
  const { displayName } = useAuthStore();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<ContentItem[]>([]);
  const [recent, setRecent] = useState<ContentItem[]>([]);
  const [screenTime, setScreenTime] = useState<ScreenTime | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [recsRes, timeRes, libraryRes] = await Promise.all([
        childApi.getRecommendations(),
        childApi.getScreenTime(),
        childApi.getLibrary(),
      ]);
      setRecommendations((recsRes.data.data ?? []).slice(0, 10));
      setScreenTime(timeRes.data.data);
      setRecent((libraryRes.data.data ?? []).slice(0, 5));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); void fetchData(); };

  const formatMins = (m: number) => m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  const timePct = screenTime ? Math.min((screenTime.used / screenTime.limit) * 100, 100) : 0;
  const timeColor = timePct >= 90 ? '#EF4444' : timePct >= 70 ? '#F59E0B' : '#10B981';

  const renderContentCard = ({ item }: { item: ContentItem }) => (
    <TouchableOpacity
      onPress={() => router.push(`/watch/${item.id}`)}
      style={styles.contentCard}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      <Text style={styles.contentTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.channelName}>{item.channelName}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6C63FF" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Hi {displayName}! 🌟</Text>
        <Text style={styles.greetingSubtext}>What do you want to explore today?</Text>
      </View>

      {/* Screen time */}
      {screenTime && (
        <View style={styles.screenTimeCard}>
          <Text style={styles.screenTimeTitle}>⏰ Screen Time Today</Text>
          <View style={styles.screenTimeTrack}>
            <View style={[styles.screenTimeFill, { width: `${timePct}%` as `${number}%`, backgroundColor: timeColor }]} />
          </View>
          <Text style={styles.screenTimeLabel}>
            {formatMins(screenTime.used)} used · {formatMins(screenTime.remaining)} remaining
          </Text>
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Recommended For You</Text>
          <FlatList
            data={recommendations}
            renderItem={renderContentCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Keep watching */}
      {recent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>▶️ Keep Watching</Text>
          <FlatList
            data={recent}
            renderItem={renderContentCard}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗂 Browse by Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              onPress={() => router.push(`/(tabs)/library?category=${cat.label}`)}
              style={styles.categoryCard}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 20, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  greeting: { marginBottom: 20 },
  greetingText: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  greetingSubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  screenTimeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  screenTimeTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  screenTimeTrack: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  screenTimeFill: { height: 10, borderRadius: 5 },
  screenTimeLabel: { fontSize: 12, color: '#6B7280' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E', marginBottom: 12 },
  horizontalList: { gap: 12, paddingRight: 20 },
  contentCard: { width: 150, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  thumbnail: { width: 150, height: 85, backgroundColor: '#E5E7EB' },
  contentTitle: { fontSize: 12, fontWeight: '600', color: '#1A1A2E', padding: 8, paddingBottom: 2 },
  channelName: { fontSize: 10, color: '#9CA3AF', paddingHorizontal: 8, paddingBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard: { width: '22%', aspectRatio: 1, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  categoryEmoji: { fontSize: 24 },
  categoryLabel: { fontSize: 10, fontWeight: '600', color: '#374151', marginTop: 4 },
});
