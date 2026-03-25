import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/stores/auth.store';
import { parentApi } from '../../../src/lib/api';
import { useState } from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const { parent, logout } = useAuthStore();
  const [pushEnabled, setPushEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await parentApi.login; // no-op placeholder
            } catch { /* ignore */ }
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const initials = parent
    ? `${parent.firstName[0] ?? ''}${parent.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{parent?.firstName} {parent?.lastName}</Text>
          <Text style={styles.profileEmail}>{parent?.email}</Text>
        </View>
      </View>

      {/* Notification settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push notifications</Text>
            <Text style={styles.settingDesc}>Get alerted when your child requests a video</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ true: '#6C63FF', false: '#E5E7EB' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>Kiddies Content</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>COPPA compliance</Text>
          <Text style={[styles.infoValue, { color: '#10B981' }]}>✓ Compliant</Text>
        </View>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <TouchableOpacity style={styles.linkRow}>
          <Text style={styles.linkLabel}>Export my data</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Alert.alert(
            'Delete account',
            'This will permanently delete your account and all your children\'s data. Contact support to proceed.',
          )}
        >
          <Text style={[styles.linkLabel, { color: '#EF4444' }]}>Delete account</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  profileEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  settingDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  linkLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  linkArrow: { fontSize: 18, color: '#9CA3AF' },
  logoutBtn: { marginHorizontal: 16, marginTop: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
