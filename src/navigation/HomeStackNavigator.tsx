import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/home/HomeScreen";
import SyncErrorsScreen from "@/screens/support/SyncErrorsScreen";
import OrderDetailScreen from "@/screens/orders/OrderDetailScreen";
import ShipmentDetailScreen from "@/screens/orders/ShipmentDetailScreen";
import RaiseIssueScreen from "@/screens/orders/RaiseIssueScreen";

export type HomeStackParamList = {
  HomeMain: undefined;
  SyncErrors: undefined;
  OrderDetail: { orderId: string };
  ShipmentDetail: { orderId: string; shipmentId: string };
  RaiseIssue: { orderId: string; shipmentId?: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="SyncErrors" component={SyncErrorsScreen} options={{ headerShown: true, title: "Sync issues" }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
      <Stack.Screen name="RaiseIssue" component={RaiseIssueScreen} />
    </Stack.Navigator>
  );
}