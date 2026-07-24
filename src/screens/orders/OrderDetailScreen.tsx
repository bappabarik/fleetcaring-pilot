import { View, Text, ScrollView, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { Button } from "@/components/ui/Button";
import { enqueueAction } from "@/offline/actionQueue";
import { drainActionQueue } from "@/offline/syncEngine";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

function deriveOrderStage(statuses: string[]): "not_started" | "enroute" | "arrived" | "in_progress_or_beyond" {
  if (statuses.every((s) => s === "CREATED" || s === "ASSIGNED")) return "not_started";
  if (statuses.every((s) => s === "ON_THE_WAY")) return "enroute";
  if (statuses.every((s) => s === "ARRIVED")) return "arrived";
  return "in_progress_or_beyond";
}

export default function OrderDetailScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, "OrderDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const queryClient = useQueryClient();
  const { orderId } = route.params;

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.getById(orderId),
  });

  const order = orderQuery.data;
  const stage = order ? deriveOrderStage(order.shipments.map((s) => s.status)) : "not_started";

  async function runQueuedAction(enqueue: () => Promise<string>) {
    await enqueue();
    await drainActionQueue();
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["my-shipments"] });
  }

  function handleEnroute() {
    Alert.alert("Start this order?", "This marks you as on the way to the customer.", [
      { text: "Cancel", style: "cancel" },
      { text: "Enroute", onPress: () => runQueuedAction(() => enqueueAction("ENROUTE_ORDER", { orderId })) },
    ]);
  }

  function handleConfirmArrival() {
    Alert.alert("Confirm arrival?", "Only confirm once you're actually at the location.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => runQueuedAction(() => enqueueAction("CONFIRM_ARRIVAL", { orderId })),
      },
    ]);
  }

  function handleCallCustomer() {
    if (!order?.user?.phoneNumber) return;
    Linking.openURL(`tel:${order.user.phoneNumber}`);
  }

  if (orderQuery.isLoading || !order) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-slate-dark">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-4" contentContainerClassName="pb-10">
        <Text onPress={() => navigation.goBack()} className="mb-4 text-2xl text-ink">
          ←
        </Text>

        <Text className="mb-4 text-xl font-bold text-ink">Order #{order.orderNumber}</Text>

        {order.notes.length > 0 && (
          <View className="mb-4 rounded-xl bg-indigo/10 p-4">
            <Text className="text-sm font-medium text-indigo">{order.notes[0].text}</Text>
          </View>
        )}

        <Text className="mb-2 font-semibold text-ink">Deliver to</Text>
        <View className="mb-4 rounded-xl bg-paper p-4">
          <Text className="font-medium text-ink">{order.address?.addressText ?? "—"}</Text>
          {order.address?.notes && (
            <Text className="mt-2 text-sm text-slate-dark">Parking notes: {order.address.notes}</Text>
          )}
        </View>

        <Text className="mb-2 font-semibold text-ink">Vehicles</Text>
        <View className="mb-6 gap-2">
          {order.shipments.map((shipment) => (
            <View key={shipment.id} className="rounded-xl border border-slate-light/60 p-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-medium text-ink">
                  {shipment.vehicle ? `${shipment.vehicle.make} ${shipment.vehicle.model}` : "—"}
                </Text>
                <Text className="font-mono text-xs text-slate-dark">{shipment.vehicle?.licensePlate}</Text>
              </View>
              <Text className="text-sm text-slate-dark">{shipment.itemVariation?.name ?? "—"}</Text>
              {shipment.addOns.length > 0 && (
                <Text className="mt-1 text-xs text-slate-dark">
                  + {shipment.addOns.map((a) => a.itemVariation?.name).filter(Boolean).join(", ")}
                </Text>
              )}
            </View>
          ))}
        </View>

        {stage === "not_started" && <Button label="Enroute" onPress={handleEnroute} />}

        {stage === "enroute" && (
          <View className="gap-3">
            <Button label="Confirm arrival" onPress={handleConfirmArrival} />
            <Button label="Contact customer" variant="secondary" onPress={handleCallCustomer} />
          </View>
        )}

        {stage === "arrived" && <Button label="Contact customer" variant="secondary" onPress={handleCallCustomer} />}

        {stage === "in_progress_or_beyond" && (
          <Text className="text-center text-sm text-slate-dark">
            Pre-checks and in-progress work aren't built yet — that's the next build step.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}