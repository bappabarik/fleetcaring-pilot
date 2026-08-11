import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders";
import { Button } from "@/components/ui/Button";
import { PhotoCaptureGrid, type CapturedPhoto } from "@/components/orders/PhotoCaptureGrid";
import { enqueueAction, getActionById, hasPendingActionMatching } from "@/offline/actionQueue";
import { drainEverything } from "@/offline/syncEngine";
import { useSyncStatus } from "@/offline/useSyncStatus";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

const MIN_PHOTOS = 2;

export default function ShipmentDetailScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, "ShipmentDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const queryClient = useQueryClient();
  const { orderId, shipmentId } = route.params;
  const { pendingCount, uploadingPhotoCount, failedPhotoCount } = useSyncStatus();

  const [preCheckPhotos, setPreCheckPhotos] = useState<CapturedPhoto[]>([]);
  const [preCheckNotes, setPreCheckNotes] = useState("");
  const [postCheckPhotos, setPostCheckPhotos] = useState<CapturedPhoto[]>([]);
  const [postCheckNotes, setPostCheckNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.getById(orderId),
  });

  const shipment = orderQuery.data?.shipments.find((s) => s.id === shipmentId);

  async function handleSubmitPreCheck() {
    if (preCheckPhotos.length < MIN_PHOTOS) return;

    Alert.alert("Complete pre-checks", "Are you sure you want to complete pre-checks for this vehicle?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          setSubmitting(true);
          try {
            const alreadyQueued = await hasPendingActionMatching(
              "SUBMIT_PRE_CHECK",
              (p) => p.shipmentId === shipmentId
            );
            if (alreadyQueued) {
              await drainEverything();
              queryClient.invalidateQueries({ queryKey: ["order", orderId] });
              return;
            }

            const actionId = await enqueueAction("SUBMIT_PRE_CHECK", {
              shipmentId,
              photoQueueIds: preCheckPhotos.map((p) => p.queueId),
              notes: preCheckNotes || undefined,
            });
            await drainEverything();
            queryClient.invalidateQueries({ queryKey: ["order", orderId] });

            const stillQueued = await getActionById(actionId);
            if (stillQueued) {
              Alert.alert(
                "Still syncing",
                stillQueued.status === "failed"
                  ? stillQueued.errorMessage ?? "This couldn't be submitted. Check Sync issues to retry."
                  : "Your photos may still be uploading, or you're offline — this will complete automatically once ready."
              );
            }
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  async function handleSubmitPostCheck() {
    if (postCheckPhotos.length < MIN_PHOTOS) return;

    Alert.alert("Complete post checks", "All information added cannot be changed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          setSubmitting(true);
          try {
            const alreadyQueued = await hasPendingActionMatching(
              "SUBMIT_POST_CHECK",
              (p) => p.shipmentId === shipmentId
            );
            if (alreadyQueued) {
              await drainEverything();
              queryClient.invalidateQueries({ queryKey: ["order", orderId] });
              queryClient.invalidateQueries({ queryKey: ["my-shipments"] });
              return;
            }

            const actionId = await enqueueAction("SUBMIT_POST_CHECK", {
              shipmentId,
              photoQueueIds: postCheckPhotos.map((p) => p.queueId),
              notes: postCheckNotes || undefined,
            });
            await drainEverything();
            queryClient.invalidateQueries({ queryKey: ["order", orderId] });
            queryClient.invalidateQueries({ queryKey: ["my-shipments"] });

            const stillQueued = await getActionById(actionId);
            if (stillQueued) {
              Alert.alert(
                "Still syncing",
                stillQueued.status === "failed"
                  ? stillQueued.errorMessage ?? "This couldn't be submitted. Check Sync issues to retry."
                  : "Your photos may still be uploading, or you're offline — this will complete automatically once ready."
              );
            }
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  }

  if (orderQuery.isLoading || !shipment) {
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

        <Text className="mb-1 text-xl font-bold text-ink">
          {shipment.vehicle ? `${shipment.vehicle.make} ${shipment.vehicle.model}` : "Vehicle"}
        </Text>
        <Text className="mb-4 text-sm text-slate-dark">{shipment.itemVariation?.name}</Text>

        {/* Ongoing feedback right where the pilot is actually looking —
            without this, tapping Confirm goes quiet for however long the
            upload takes with nothing on screen to show it's still
            working, which is exactly what leads to re-tapping. */}
        {failedPhotoCount > 0 && (
          <Text
            onPress={() => navigation.navigate("SyncErrors")}
            className="mb-4 rounded-lg bg-rust/10 px-3 py-2 text-center text-sm font-medium text-rust"
          >
            {failedPhotoCount} photo{failedPhotoCount > 1 ? "s" : ""} couldn't upload — tap to retry
          </Text>
        )}
        {failedPhotoCount === 0 && (uploadingPhotoCount > 0 || pendingCount > 0) && (
          <View className="mb-4 flex-row items-center justify-center gap-2 rounded-lg bg-amber/10 px-3 py-2">
            <Text className="text-center text-sm font-medium text-amber">
              {uploadingPhotoCount > 0
                ? `Uploading ${uploadingPhotoCount} photo${uploadingPhotoCount > 1 ? "s" : ""}…`
                : "Syncing…"}
            </Text>
          </View>
        )}

        {shipment.status === "ARRIVED" && (
          <View className="gap-4">
            <Text className="font-semibold text-ink">Pre-checks</Text>
            <PhotoCaptureGrid purpose="precheck" photos={preCheckPhotos} onChange={setPreCheckPhotos} />
            <Button
              label="Confirm"
              loading={submitting}
              disabled={preCheckPhotos.length < MIN_PHOTOS}
              onPress={handleSubmitPreCheck}
            />
          </View>
        )}

        {shipment.status === "IN_PROGRESS" && (
          <View className="items-center gap-6 pt-8">
            <Text className="text-lg font-semibold text-ink">Order in progress</Text>
            <Text className="text-sm text-slate-dark">{shipment.itemVariation?.name}</Text>
            <View className="w-full gap-4">
              <Text className="font-semibold text-ink">Post-checks</Text>
              <PhotoCaptureGrid purpose="postcheck" photos={postCheckPhotos} onChange={setPostCheckPhotos} />
              <Button
                label="Move to post checks"
                loading={submitting}
                disabled={postCheckPhotos.length < MIN_PHOTOS}
                onPress={handleSubmitPostCheck}
              />
            </View>
          </View>
        )}

        {(shipment.status === "COMPLETED" || shipment.status === "ISSUE_RAISED") && (
          <Text className="text-center text-sm text-slate-dark">
            This item is {shipment.status === "COMPLETED" ? "completed" : "marked with an issue"}.
          </Text>
        )}

        {shipment.status !== "COMPLETED" && shipment.status !== "ISSUE_RAISED" && (
          <Text
            onPress={() => navigation.navigate("RaiseIssue", { orderId, shipmentId })}
            className="mt-6 text-center text-sm font-medium text-rust"
          >
            Raise an issue with this vehicle
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}