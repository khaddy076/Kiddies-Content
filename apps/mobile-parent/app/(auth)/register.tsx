import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { parentApi } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/auth.store";

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof form) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const handleRegister = async () => {
    if (!form.firstName || !form.email || !form.password) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }
    if (form.password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await parentApi.register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      const { accessToken, refreshToken, parent } = res.data.data as {
        accessToken: string;
        refreshToken: string;
        parent: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
        };
      };
      await setAuth(parent, accessToken, refreshToken);
      router.replace("/(tabs)/requests");
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      Alert.alert(
        "Registration failed",
        e.response?.data?.error?.message ?? "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoSection}>
          <Text style={styles.logoEmoji}>👨‍👩‍👧‍👦</Text>
          <Text style={styles.logoTitle}>Create Account</Text>
          <Text style={styles.logoSubtitle}>
            Start protecting your children today
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>First name *</Text>
              <TextInput
                value={form.firstName}
                onChangeText={update("firstName")}
                placeholder="Jane"
                style={styles.input}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                value={form.lastName}
                onChangeText={update("lastName")}
                placeholder="Smith"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Email *</Text>
          <TextInput
            value={form.email}
            onChangeText={update("email")}
            placeholder="parent@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Password *</Text>
          <TextInput
            value={form.password}
            onChangeText={update("password")}
            placeholder="Minimum 8 characters"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{" "}
              <Text style={{ color: "#6C63FF", fontWeight: "700" }}>
                Log in
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8F9FA",
    padding: 24,
    justifyContent: "center",
  },
  logoSection: { alignItems: "center", marginBottom: 32 },
  logoEmoji: { fontSize: 48 },
  logoTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A2E",
    marginTop: 10,
  },
  logoSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  row: { flexDirection: "row" },
  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 6 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A2E",
  },
  btn: {
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loginLink: { marginTop: 16, alignItems: "center" },
  loginLinkText: { fontSize: 14, color: "#6B7280" },
});
