import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { childApi, authHttp } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/auth.store";
import * as SecureStore from "expo-secure-store";

interface ChildOption {
  id: string;
  displayName: string;
  ageGroup: string;
}

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [step, setStep] = useState<"email" | "child" | "pin">("email");
  const [parentEmail, setParentEmail] = useState("");
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildOption | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleEmailSubmit = async () => {
    if (!parentEmail.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      // Fetch children for this parent email (public endpoint)
      const res = await authHttp.get("/child/list", {
        params: { parentEmail },
      });
      const kids: ChildOption[] = res.data.data ?? [];
      if (kids.length === 0) {
        Alert.alert(
          "No children found",
          "No child accounts are associated with this email",
        );
        return;
      }
      setChildren(kids);
      setStep("child");
    } catch {
      Alert.alert("Error", "Could not find account. Check the email address.");
    } finally {
      setLoading(false);
    }
  };

  const handleChildSelect = (child: ChildOption) => {
    setSelectedChild(child);
    setStep("pin");
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };

  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  const handlePinSubmit = async () => {
    if (!selectedChild || pin.length < 4) return;
    setLoading(true);
    try {
      const res = await childApi.login(parentEmail, selectedChild.id, pin);
      const { user, tokens } = res.data.data;
      await login({
        childId: user.id,
        parentId: user.parentId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        token: tokens.accessToken,
      });
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { error?: { code?: string; message?: string } } };
      };
      const code = error.response?.data?.error?.code;
      if (code === "ACCOUNT_LOCKED") {
        Alert.alert(
          "Account Locked",
          error.response?.data?.error?.message ?? "Too many attempts",
        );
      } else {
        shake();
        setPinAttempts((a) => a + 1);
        setPin("");
        if (pinAttempts >= 4) {
          Alert.alert(
            "Too many attempts",
            "Ask your parent to unlock your account",
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when PIN is long enough
  if (pin.length >= 4 && step === "pin" && !loading) {
    // Small delay to show the last dot
    setTimeout(() => {
      void handlePinSubmit();
    }, 200);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.title}>
            {step === "email"
              ? "Welcome to Kiddies!"
              : step === "child"
                ? "Who are you?"
                : `Hi ${selectedChild?.displayName}! 👋`}
          </Text>
          <Text style={styles.subtitle}>
            {step === "email"
              ? "Enter your parent's email to get started"
              : step === "child"
                ? "Choose your profile"
                : "Enter your secret PIN"}
          </Text>
        </View>

        {/* Step: Email */}
        {step === "email" && (
          <View style={styles.form}>
            <TextInput
              value={parentEmail}
              onChangeText={setParentEmail}
              placeholder="Parent's email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TouchableOpacity
              onPress={handleEmailSubmit}
              disabled={loading}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Next →</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Select child */}
        {step === "child" && (
          <View style={styles.childList}>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                onPress={() => handleChildSelect(child)}
                style={styles.childCard}
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>
                    {child.displayName[0]?.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.childName}>{child.displayName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step: PIN */}
        {step === "pin" && (
          <View style={styles.pinContainer}>
            <Animated.View
              style={[
                styles.pinDots,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length)).map((i) => (
                <View
                  key={i}
                  style={[styles.pinDot, i < pin.length && styles.pinDotFilled]}
                />
              ))}
            </Animated.View>

            {/* Number pad */}
            <View style={styles.numpad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
                (digit, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() =>
                      digit === "⌫"
                        ? handlePinDelete()
                        : digit
                          ? handlePinInput(digit)
                          : null
                    }
                    disabled={!digit || loading}
                    style={[styles.numKey, !digit && { opacity: 0 }]}
                  >
                    <Text style={styles.numKeyText}>{digit}</Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            {loading && (
              <ActivityIndicator color="#6C63FF" style={{ marginTop: 16 }} />
            )}

            <TouchableOpacity
              onPress={() => {
                setStep("child");
                setPin("");
              }}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>
                ← Choose a different profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scroll: { flexGrow: 1, padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 40 },
  logo: {
    width: 72,
    height: 72,
    backgroundColor: "#6C63FF",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    textAlign: "center",
  },
  form: { gap: 12 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#6C63FF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  childList: { gap: 12 },
  childCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  childAvatar: {
    width: 56,
    height: 56,
    backgroundColor: "#6C63FF",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  childAvatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  childName: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  pinContainer: { alignItems: "center", gap: 32 },
  pinDots: { flexDirection: "row", gap: 16 },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#6C63FF",
    backgroundColor: "transparent",
  },
  pinDotFilled: { backgroundColor: "#6C63FF" },
  numpad: { flexDirection: "row", flexWrap: "wrap", width: 270, gap: 12 },
  numKey: {
    width: 78,
    height: 78,
    backgroundColor: "#fff",
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  numKeyText: { fontSize: 24, fontWeight: "700", color: "#1A1A2E" },
  backLink: { marginTop: 8 },
  backLinkText: { color: "#6C63FF", fontSize: 14, fontWeight: "600" },
});
