import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuthStore } from "@/store/authStore";
import { AuthNavigator } from "./AuthNavigator";
import PlaceholderHomeScreen from "@/screens/home/PlaceholderHomeScreen";

export function RootNavigator() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3652D9" />
      </View>
    );
  }

  return <NavigationContainer>{refreshToken ? <PlaceholderHomeScreen /> : <AuthNavigator />}</NavigationContainer>;
}
