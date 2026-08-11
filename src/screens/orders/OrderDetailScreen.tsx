import { View, Text, ScrollView, Linking, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { Button } from "@/components/ui/Button";
import { SwipeToConfirm } from "@/components/ui/SwipeToConfirm";
import { enqueueAction, getActionById } from "@/offline/actionQueue";
import { drainActionQueue } from "@/offline/syncEngine";
import { formatMoney } from "@/utils/format";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

function deriveOrderStage(statuses: string[]): "not_started" | "enroute" | "arrived" | "in_progress_or_beyond" {
  if (statuses.every((s) => s === "CREATED" || s === "ASSIGNED")) return "not_started";
  if (statuses.every((s) => s === "ON_THE_WAY")) return "enroute";
  if (statuses.every((s) => s === "ARRIVED")) return "arrived";
  return "in_progress_or_beyond";
}

function allItemsResolved(statuses: string[]): boolean {
  return statuses.every((s) => s === "COMPLETED" || s === "ISSUE_RAISED");
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
  const statuses = order?.shipments.map((s) => s.status) ?? [];
  const stage = order ? deriveOrderStage(statuses) : "not_started";
  const shipmentsAreTappable = stage === "arrived" || stage === "in_progress_or_beyond";
  const canRaiseIssue = stage === "arrived" || stage === "in_progress_or_beyond";
  const canComplete = stage === "in_progress_or_beyond" && allItemsResolved(statuses) && !order?.completedAt;
  const codPendingCollection = order?.payment?.provider === "cod" && order.payment.status !== "CAPTURED";

  async function runQueuedAction(enqueue: () => Promise<string>) {
    const actionId = await enqueue();
    await drainActionQueue();
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["my-shipments"] });
    return actionId;
  }

  // No Alert confirmation here on purpose — the swipe gesture itself
  // (SwipeToConfirm, dragged deliberately across the track) IS the
  // confirmation. Stacking a tap-through dialog on top of it would just
  // be a second confirmation for the same action.
  function handleEnroute() {
    runQueuedAction(() => enqueueAction("ENROUTE_ORDER", { orderId }));
  }

  function handleConfirmArrival() {
    runQueuedAction(() => enqueueAction("CONFIRM_ARRIVAL", { orderId }));
  }

  function handleCallCustomer() {
    if (!order?.user?.phoneNumber) return;
    Linking.openURL(`tel:${order.user.phoneNumber}`);
  }

  async function handleCompleteOrder() {
    const cashAmount = order?.payment ? formatMoney(order.payment.amount) : "";
    Alert.alert(
      "Complete this order?",
      codPendingCollection
        ? `Make sure every item is completed or has an issue raised, and confirm you've collected ${cashAmount} in cash.`
        : "Make sure every item is completed or has an issue raised first.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: codPendingCollection ? "Complete & collect cash" : "Complete",
          onPress: async () => {
            const actionId = await runQueuedAction(() => enqueueAction("COMPLETE_ORDER", { orderId }));
            if (codPendingCollection) {
              await runQueuedAction(() => enqueueAction("COLLECT_COD", { orderId }));
            }
            const stillQueued = await getActionById(actionId);
            if (stillQueued) {
              Alert.alert(
                "Still syncing",
                stillQueued.status === "failed"
                  ? stillQueued.errorMessage ?? "This couldn't be completed. Check Sync issues to retry."
                  : "You're offline — this will complete automatically once reconnected."
              );
            }
          },
        },
      ]
    );
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
          {order.shipments.map((shipment) => {
            const row = (
              <View className="rounded-xl border border-slate-light/60 p-3">
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
                {shipmentsAreTappable && (
                  <Text className="mt-1 text-xs font-medium text-indigo">{shipment.status.replaceAll("_", " ")}</Text>
                )}
              </View>
            );

            return shipmentsAreTappable ? (
              <Pressable
                key={shipment.id}
                onPress={() => navigation.navigate("ShipmentDetail", { orderId, shipmentId: shipment.id })}
              >
                {row}
              </Pressable>
            ) : (
              <View key={shipment.id}>{row}</View>
            );
          })}
        </View>

        {stage === "not_started" && <SwipeToConfirm label="Swipe to start — Enroute" onConfirm={handleEnroute} />}

        {stage === "enroute" && (
          <View className="gap-3">
            <SwipeToConfirm label="Swipe to confirm arrival" onConfirm={handleConfirmArrival} />
            <Button label="Contact customer" variant="secondary" onPress={handleCallCustomer} />
          </View>
        )}

        {(stage === "arrived" || stage === "in_progress_or_beyond") && (
          <View className="gap-3">
            {codPendingCollection && !order.completedAt && (
              <View className="rounded-xl bg-amber/10 p-3">
                <Text className="text-sm font-medium text-amber">
                  Collect {formatMoney(order.payment!.amount)} in cash on completion
                </Text>
              </View>
            )}
            {!order.completedAt && (
              <Button
                label="Complete order"
                disabled={!canComplete}
                onPress={handleCompleteOrder}
              />
            )}
            <View className="flex-row gap-3">
              <Button label="Contact customer" variant="secondary" onPress={handleCallCustomer} className="flex-1" />
              {canRaiseIssue && (
                <Button
                  label="Raise an issue"
                  variant="secondary"
                  onPress={() => navigation.navigate("RaiseIssue", { orderId })}
                  className="flex-1"
                />
              )}
            </View>
            {!canComplete && !order.completedAt && (
              <Text className="text-center text-xs text-slate-dark">
                Every item must be completed or have an issue raised before this order can be completed.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}