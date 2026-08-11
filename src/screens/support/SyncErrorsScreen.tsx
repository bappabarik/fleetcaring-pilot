import { View, Text, Image, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncStatus } from "@/offline/useSyncStatus";
import {
  retryAction,
  discardAction,
  type QueuedAction,
} from "@/offline/actionQueue";
import { retryPhoto, type QueuedPhoto } from "@/offline/photoQueue";
import { drainEverything } from "@/offline/syncEngine";
import { Button } from "@/components/ui/Button";

const ACTION_LABELS: Record<QueuedAction["actionType"], string> = {
  START_SHIFT: "Start shift",
  END_SHIFT: "End shift",
  START_BREAK: "Start break",
  END_BREAK: "End break",
  ENROUTE_ORDER: "Mark order enroute",
  CONFIRM_ARRIVAL: "Confirm arrival",
  SUBMIT_PRE_CHECK: "Submit pre-check",
  SUBMIT_POST_CHECK: "Submit post-check",
  RAISE_ISSUE: "Raise an issue",
  COMPLETE_ORDER: "Complete order",
  COLLECT_COD: "Collect cash payment",
};

export default function SyncErrorsScreen() {
  const queryClient = useQueryClient();
  const { failedActions, failedPhotos } = useSyncStatus();

  function refreshStatus() {
    queryClient.invalidateQueries({ queryKey: ["offline-pending-actions"] });
    queryClient.invalidateQueries({ queryKey: ["offline-failed-actions"] });
    queryClient.invalidateQueries({ queryKey: ["offline-unresolved-photos"] });
    queryClient.invalidateQueries({ queryKey: ["offline-failed-photos"] });
  }

  async function handleRetry(action: QueuedAction) {
    await retryAction(action.id);
    refreshStatus();
    await drainEverything();
    refreshStatus();
  }

  async function handleDiscard(action: QueuedAction) {
    Alert.alert("Discard this action?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: async () => {
          await discardAction(action.id);
          refreshStatus();
        },
      },
    ]);
  }

  async function handleRetryPhoto(photo: QueuedPhoto) {
    await retryPhoto(photo.id);
    refreshStatus();
    await drainEverything();
    refreshStatus();
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerClassName="pb-10"
      >
        <Text className="mb-4 text-xl font-bold text-ink">Sync issues</Text>

        {failedActions.length === 0 && failedPhotos.length === 0 ? (
          <Text className="text-center text-sm text-slate-dark">
            Nothing needs attention right now.
          </Text>
        ) : (
          <View className="gap-3">
            {failedActions.map((action) => (
              <View
                key={action.id}
                className="rounded-xl border border-rust/30 bg-rust/5 p-4"
              >
                <Text className="font-semibold text-ink">
                  {ACTION_LABELS[action.actionType]}
                </Text>
                <Text className="mb-3 mt-1 text-sm text-slate-dark">
                  {action.errorMessage}
                </Text>
                <View className="flex-row gap-2">
                  <Button
                    label="Retry"
                    variant="secondary"
                    onPress={() => handleRetry(action)}
                  />
                  <Button
                    label="Discard"
                    variant="danger"
                    onPress={() => handleDiscard(action)}
                  />
                </View>
              </View>
            ))}

            {failedPhotos.map((photo) => (
              <View
                key={photo.id}
                className="rounded-xl border border-rust/30 bg-rust/5 p-4"
              >
                <View className="mb-3 flex-row items-center gap-3">
                  <Image source={{ uri: photo.localUri }} className="h-14 w-14 rounded-lg" />
                  <View className="flex-1">
                    <Text className="font-semibold text-ink">Photo upload failed</Text>
                    <Text className="mt-1 text-sm text-slate-dark">
                      {photo.errorMessage ?? "Couldn't upload this photo."}
                    </Text>
                  </View>
                </View>
                {/* No discard here on purpose — this photo is still referenced by
                    whatever pre-check/post-check/issue is waiting on it, so
                    dropping it would just leave that submission stuck forever
                    instead of failing loudly. Retry is the only way forward. */}
                <Button label="Retry" variant="secondary" onPress={() => handleRetryPhoto(photo)} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
