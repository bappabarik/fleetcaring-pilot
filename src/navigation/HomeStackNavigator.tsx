import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/home/HomeScreen";
import SyncErrorsScreen from "@/screens/support/SyncErrorsScreen";
import OrderDetailScreen from "@/screens/orders/OrderDetailScreen";

export type HomeStackParamList = {
  HomeMain: undefined;
  SyncErrors: undefined;
  OrderDetail: { orderId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="SyncErrors" component={SyncErrorsScreen} options={{ headerShown: true, title: "Sync issues" }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}