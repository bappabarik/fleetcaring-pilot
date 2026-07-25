import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import type { SupportStackParamList } from "@/navigation/SupportStackNavigator";

export default function SupportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SupportStackParamList>>();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);

  async function handleSignOut() {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Sign out locally regardless.
      }
    }
    await clear();
  }

  function notAvailableYet(feature: string) {
    Alert.alert(feature, "This isn't available yet.");
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-4">
        <Text className="mb-6 text-xl font-bold text-ink">Support</Text>

        <View className="rounded-xl border border-slate-light/60">
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            className="flex-row items-center justify-between border-b border-slate-light/60 px-4 py-4"
          >
            <Text className="text-ink">Settings</Text>
            <Text className="text-slate-dark">›</Text>
          </Pressable>
          <Pressable
            onPress={() => notAvailableYet("Pilot performance")}
            className="flex-row items-center justify-between border-b border-slate-light/60 px-4 py-4"
          >
            <Text className="text-ink">Pilot performance</Text>
            <Text className="text-slate-dark">›</Text>
          </Pressable>
          <Pressable onPress={() => notAvailableYet("Help")} className="flex-row items-center justify-between px-4 py-4">
            <Text className="text-ink">Help</Text>
            <Text className="text-slate-dark">›</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleSignOut} className="mt-6 rounded-xl border border-rust/30 bg-rust/5 px-4 py-3.5">
          <Text className="text-center font-medium text-rust">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}