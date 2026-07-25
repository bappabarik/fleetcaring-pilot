import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SupportScreen from "@/screens/support/SupportScreen";
import SettingsScreen from "@/screens/settings/SettingsScreen";

export type SupportStackParamList = {
  SupportMain: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<SupportStackParamList>();

export function SupportStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupportMain" component={SupportScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}