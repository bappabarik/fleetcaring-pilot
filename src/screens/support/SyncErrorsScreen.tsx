import { View, Text, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useSyncStatus } from "@/offline/useSyncStatus";
import {
  retryAction,
  discardAction,
  type QueuedAction,
} from "@/offline/actionQueue";
import { drainActionQueue } from "@/offline/syncEngine";
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
  const { failedActions } = useSyncStatus();

  function refreshStatus() {
    queryClient.invalidateQueries({ queryKey: ["offline-pending-actions"] });
    queryClient.invalidateQueries({ queryKey: ["offline-failed-actions"] });
  }

  async function handleRetry(action: QueuedAction) {
    await retryAction(action.id);
    refreshStatus();
    await drainActionQueue();
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerClassName="pb-10"
      >
        <Text className="mb-4 text-xl font-bold text-ink">Sync issues</Text>

        {failedActions.length === 0 ? (
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
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
