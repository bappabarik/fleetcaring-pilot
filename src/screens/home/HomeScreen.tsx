import { useMemo, useState } from "react";
import { View, Text, ScrollView, Switch, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { shiftsApi, type BreakReason } from "@/api/shifts";
import { shipmentsApi } from "@/api/shipments";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { CountdownCircle } from "@/components/ui/CountdownCircle";
import { BreakReasonModal } from "@/components/home/BreakReasonModal";
import { enqueueAction } from "@/offline/actionQueue";
import { drainActionQueue } from "@/offline/syncEngine";
import { useSyncStatus } from "@/offline/useSyncStatus";
import { useCountdown, formatHoursMinutes, formatShiftDateTime, COUNTDOWN_DISPLAY_THRESHOLD_MS } from "@/lib/countdown";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl bg-paper p-4">
      <Text className="mb-1 text-xs text-slate-dark">{label}</Text>
      <Text className="text-sm font-semibold text-ink">{value}</Text>
    </View>
  );
}

function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const { pendingCount, failedCount } = useSyncStatus();

  const dashboardQuery = useQuery({
    queryKey: ["pilot-dashboard"],
    queryFn: shiftsApi.getDashboard,
    refetchInterval: 20_000,
  });

  const dashboard = dashboardQuery.data;
  const shift = dashboard?.shift ?? null;
  const isOnDuty = dashboard?.state === "ON_DUTY";

  const todaysJobsQuery = useQuery({
    queryKey: ["my-shipments", todayIsoDate()],
    queryFn: () => shipmentsApi.listMine({ date: todayIsoDate(), limit: 50 }),
    enabled: isOnDuty,
  });

  // console.log(todaysJobsQuery.data?.items);
  
  const shiftCountdown = useCountdown(shift?.startTime ?? null);
  const breakCountdown = useCountdown(
    dashboard?.activeBreak
      ? new Date(
          new Date(dashboard.activeBreak.startedAt).getTime() + dashboard.activeBreak.durationAllowedMins * 60_000
        ).toISOString()
      : null
  );

  const withinStartWindow = shift ? shiftCountdown.totalMs <= COUNTDOWN_DISPLAY_THRESHOLD_MS : false;

  async function runQueuedAction(enqueue: () => Promise<string>) {
    await enqueue();
    queryClient.invalidateQueries({ queryKey: ["offline-pending-actions"] });
    await drainActionQueue();
    queryClient.invalidateQueries({ queryKey: ["pilot-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["offline-pending-actions"] });
    queryClient.invalidateQueries({ queryKey: ["offline-failed-actions"] });
  }

  async function handleStartShift() {
    if (!shift) return;
    await runQueuedAction(() => enqueueAction("START_SHIFT", { shiftId: shift.id }));
  }

  async function handleEndShift() {
    if (!shift) return;
    await runQueuedAction(() => enqueueAction("END_SHIFT", { shiftId: shift.id }));
  }

  async function handleStartBreak(reason: BreakReason) {
    if (!shift) return;
    setBreakModalVisible(false);
    await runQueuedAction(() => enqueueAction("START_BREAK", { shiftId: shift.id, reason }));
  }

  async function handleEndBreak() {
    if (!shift || !dashboard?.activeBreak) return;
    await runQueuedAction(() =>
      enqueueAction("END_BREAK", { shiftId: shift.id, breakId: dashboard.activeBreak!.id })
    );
  }

  async function handleSignOut() {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Sign out locally regardless.
      }
    }
    await clear();
  }

  const content = useMemo(() => {
    if (!dashboard) return null;

    if (dashboard.state === "NO_SHIFT") {
      return (
        <View className="items-center pt-12">
          <View className="h-56 w-56 items-center justify-center rounded-full border-[6px] border-slate-light self-center">
            <Text className="text-lg font-semibold text-slate-dark">No shift</Text>
          </View>
        </View>
      );
    }

    if (dashboard.state === "SHIFT_SCHEDULED" && shift) {
      if (!withinStartWindow) {
        return (
          <View className="items-center gap-6 pt-12">
            <View className="h-56 w-56 items-center justify-center rounded-full border-[6px] border-slate-light self-center">
              <Text className="text-lg font-semibold text-slate-dark">No shift</Text>
            </View>
            <View className="w-full flex-row items-center gap-3 rounded-xl bg-paper p-4">
              <Text className="text-xl">📅</Text>
              <View>
                <Text className="text-xs text-slate-dark">Next shift</Text>
                <Text className="font-semibold text-ink">{formatShiftDateTime(shift.startTime)}</Text>
              </View>
            </View>
          </View>
        );
      }

      return (
        <View className="gap-6 pt-8">
          <CountdownCircle label="Shift starts in" value={formatHoursMinutes(shiftCountdown.totalMs)} />
          <Button label="Start shift" onPress={handleStartShift} />
          <View className="flex-row gap-3">
            <InfoTile label="Assigned asset" value={shift.asset?.plateCode ?? "—"} />
            <InfoTile label="Assigned zone" value={shift.zone?.name ?? "—"} />
          </View>
        </View>
      );
    }

    if (dashboard.state === "ON_DUTY" && shift) {
      return (
        <View className="gap-6 pt-4">
          <View className="flex-row items-center justify-between rounded-xl bg-paper p-4">
            <Text className="font-semibold text-ink">On duty</Text>
            <Switch
              value={true}
              onValueChange={() => setBreakModalVisible(true)}
              trackColor={{ true: "#3652D9", false: "#C3C9D6" }}
            />
          </View>
          <View className="flex-row gap-3">
            <InfoTile label="Assigned asset" value={shift.asset?.plateCode ?? "—"} />
            <InfoTile label="Assigned zone" value={shift.zone?.name ?? "—"} />
          </View>

          <View>
            <Text className="mb-2 font-semibold text-ink">Today's jobs</Text>
            {todaysJobsQuery.isLoading ? (
              <Text className="text-sm text-slate-dark">Loading…</Text>
            ) : !todaysJobsQuery.data?.items.length ? (
              <View className="items-center rounded-xl bg-paper py-8">
                <Text className="text-slate-dark">No orders</Text>
                <Text className="mt-1 text-xs text-slate-dark">When you have orders you'll find them here</Text>
              </View>
            ) : (
              <View className="gap-2">
                {todaysJobsQuery.data.items.map((task) => (
                  <Pressable
                    key={task.shipmentId}
                    onPress={() => navigation.navigate("OrderDetail", { orderId: task.order.id })}
                    className="rounded-xl border border-slate-light/60 p-3"
                  >
                    <Text className="font-medium text-ink">{task.service.opItemName}</Text>
                    <Text className="text-xs text-slate-dark">
                      {new Date(task.scheduledStartTime).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(task.scheduledEndTime).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Button label="End shift" variant="danger" onPress={handleEndShift} />
        </View>
      );
    }

    if (dashboard.state === "ON_BREAK" && dashboard.activeBreak) {
      return (
        <View className="items-center gap-6 pt-8">
          <CountdownCircle label="Break remaining" value={formatHoursMinutes(breakCountdown.totalMs)} />
          <Button label="End break" onPress={handleEndBreak} />
        </View>
      );
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard, shift, withinStartWindow, shiftCountdown.totalMs, breakCountdown.totalMs, todaysJobsQuery.data]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-4" contentContainerClassName="pb-10">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-ink">Home</Text>
          <Text onPress={handleSignOut} className="text-sm font-medium text-rust">
            Sign out
          </Text>
        </View>

        {failedCount > 0 && (
          <Text
            onPress={() => navigation.navigate("SyncErrors")}
            className="mb-3 rounded-lg bg-rust/10 px-3 py-2 text-center text-sm font-medium text-rust"
          >
            {failedCount} action{failedCount > 1 ? "s" : ""} need attention — tap to review
          </Text>
        )}
        {failedCount === 0 && pendingCount > 0 && (
          <Text className="mb-3 rounded-lg bg-amber/10 px-3 py-2 text-center text-sm font-medium text-amber">
            Syncing {pendingCount} action{pendingCount > 1 ? "s" : ""}…
          </Text>
        )}

        {dashboardQuery.isLoading ? <Text className="text-center text-slate-dark">Loading…</Text> : content}
      </ScrollView>

      <BreakReasonModal
        visible={breakModalVisible}
        onClose={() => setBreakModalVisible(false)}
        onSelect={handleStartBreak}
      />
    </SafeAreaView>
  );
}