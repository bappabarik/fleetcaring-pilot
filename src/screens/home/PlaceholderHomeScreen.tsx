import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

/**
 * Placeholder only — Step 3 of the build order (Home dashboard with
 * shift states) replaces this entirely. Exists so Auth (Step 2) has
 * somewhere real to land and can be fully tested end-to-end on its own,
 * including sign-out, before the next module is built.
 */
export default function PlaceholderHomeScreen() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);

  async function handleSignOut() {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Sign out client-side regardless of whether the server call succeeded.
      }
    }
    await clear();
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-paper px-6">
      <Text className="mb-2 text-xl font-bold text-ink">Signed in ✓</Text>
      <Text className="mb-8 text-center text-sm text-slate-dark">
        Auth is working. The real Home dashboard (shift states, start/end shift) is Step 3 of the build order.
      </Text>
      <Button label="Sign out" variant="secondary" onPress={handleSignOut} />
    </SafeAreaView>
  );
}
