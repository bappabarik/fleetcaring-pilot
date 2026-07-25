import { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { ISSUE_REASONS, type IssueReason } from "@/api/orders";
import { Button } from "@/components/ui/Button";
import { PhotoCaptureGrid, type CapturedPhoto } from "@/components/orders/PhotoCaptureGrid";
import { enqueueAction, getActionById } from "@/offline/actionQueue";
import { drainActionQueue } from "@/offline/syncEngine";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

const MIN_PHOTOS = 2;

const REASON_LABELS: Record<IssueReason, string> = {
  GATE_GARAGE_CLOSED: "Gate/Garage closed",
  NUMBER_PLATE_NOT_MATCHING: "Number plate not matching",
  UNABLE_TO_REACH_LOCATION: "Unable to reach location",
  VEHICLE_NOT_AVAILABLE: "Vehicle is not available at the location",
  VEHICLE_PARKED_UNSAFE_AREA: "Vehicle parked in an unsafe area",
  BY_CONTROL_CENTRE: "By control centre",
  ACCESS_DENIED_BY_SECURITY: "Access denied by security",
  VEHICLE_IN_PAID_PARKING: "Vehicle is located inside paid parking",
  OTHER: "Other",
};

export default function RaiseIssueScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, "RaiseIssue">>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const queryClient = useQueryClient();
  const { orderId, shipmentId } = route.params;

  const [reasonPickerOpen, setReasonPickerOpen] = useState(false);
  const [reason, setReason] = useState<IssueReason | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!reason && photos.length >= MIN_PHOTOS;

  async function handleSubmit() {
    if (!canSubmit || !reason) return;

    setSubmitting(true);
    try {
      const actionId = await enqueueAction("RAISE_ISSUE", {
        orderId,
        shipmentId,
        reason,
        notes: notes || undefined,
        photoQueueIds: photos.map((p) => p.queueId),
      });
      await drainActionQueue();
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
      } else {
        navigation.goBack();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-4" contentContainerClassName="pb-10">
        <Text onPress={() => navigation.goBack()} className="mb-4 text-2xl text-ink">
          ←
        </Text>

        <Text className="mb-6 text-xl font-bold text-ink">Raise an issue</Text>

        <Text className="mb-1.5 text-sm font-medium text-slate-dark">Select reason</Text>
        <Pressable
          onPress={() => setReasonPickerOpen((open) => !open)}
          className="mb-4 rounded-xl border border-slate-light px-4 py-3.5"
        >
          <Text className={reason ? "text-ink" : "text-slate-dark"}>
            {reason ? REASON_LABELS[reason] : "Select reason"}
          </Text>
        </Pressable>

        {reasonPickerOpen && (
          <View className="mb-4 rounded-xl border border-slate-light">
            {ISSUE_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => {
                  setReason(r);
                  setReasonPickerOpen(false);
                }}
                className="flex-row items-center justify-between border-b border-slate-light/60 px-4 py-3.5 last:border-b-0"
              >
                <Text className="text-ink">{REASON_LABELS[r]}</Text>
                <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-slate-light">
                  {reason === r && <View className="h-2.5 w-2.5 rounded-full bg-indigo" />}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text className="mb-1.5 text-sm font-medium text-slate-dark">Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes if applicable"
          multiline
          numberOfLines={4}
          className="mb-4 rounded-xl border border-slate-light px-4 py-3.5 text-base text-ink"
        />

        <Text className="mb-2 text-sm font-medium text-slate-dark">Add a photo (min 2 photos)</Text>
        <PhotoCaptureGrid purpose="issue" photos={photos} onChange={setPhotos} minRequired={MIN_PHOTOS} />

        <Button label="Submit" loading={submitting} disabled={!canSubmit} onPress={handleSubmit} className="mt-6" />
      </ScrollView>
    </SafeAreaView>
  );
}