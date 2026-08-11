import { useMemo, useState } from "react";
import { View, Text, ScrollView, Switch, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { shiftsApi, type BreakReason } from "@/api/shifts";
import { shipmentsApi } from "@/api/shipments";
import { pilotsApi } from "@/api/pilots";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { AssetCard, ZoneCard } from "@/components/home/DutyInfoCards";
import { BreakReasonModal } from "@/components/home/BreakReasonModal";
import { enqueueAction } from "@/offline/actionQueue";
import { drainActionQueue } from "@/offline/syncEngine";
import { useSyncStatus } from "@/offline/useSyncStatus";
import { useLocationPing } from "@/realtime/useLocationPing";
import { useCountdown, formatHoursMinutes, formatShiftDateTime, COUNTDOWN_DISPLAY_THRESHOLD_MS } from "@/lib/countdown";
import { todayIsoDate } from "@/lib/date";
import { groupTasksByOrder } from "@/lib/groupTasksByOrder";
import type { HomeStackParamList } from "@/navigation/HomeStackNavigator";

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const queryClient = useQueryClient();
  const [breakModalVisible, setBreakModalVisible] = useState(false);
  const { pendingCount, failedCount, uploadingPhotoCount, failedPhotoCount } = useSyncStatus();
  const totalFailed = failedCount + failedPhotoCount;
  const totalSyncing = pendingCount + uploadingPhotoCount;

  const profileQuery = useQuery({ queryKey: ["pilot-profile"], queryFn: pilotsApi.getMe });

  const dashboardQuery = useQuery({
    queryKey: ["pilot-dashboard"],
    queryFn: shiftsApi.getDashboard,
    refetchInterval: 20_000,
  });

  const dashboard = dashboardQuery.data;
  const shift = dashboard?.shift ?? null;
  const isOnDuty = dashboard?.state === "ON_DUTY";

  useLocationPing(dashboard?.state === "ON_DUTY" || dashboard?.state === "ON_BREAK");

  const todaysJobsQuery = useQuery({
    queryKey: ["my-shipments", todayIsoDate()],
    queryFn: () => shipmentsApi.listMine({ date: todayIsoDate(), limit: 50 }),
    enabled: isOnDuty,
    // Same cadence as the dashboard query above — without this, a newly
    // assigned job only shows up once the pilot manually leaves and
    // re-enters this screen. No websocket for order data (that's reserved
    // for live location pings only), so polling is the mechanism here.
    refetchInterval: 20_000,
  });

  const shiftCountdown = useCountdown(shift?.startTime ?? null);
  const breakCountdown = useCountdown(
    dashboard?.activeBreak
      ? new Date(
          new Date(dashboard.activeBreak.startedAt).getTime() + dashboard.activeBreak.durationAllowedMins * 60_000
        ).toISOString()
      : null
  );

  const withinStartWindow = shift ? shiftCountdown.totalMs <= COUNTDOWN_DISPLAY_THRESHOLD_MS : false;
  const shiftProgress = withinStartWindow ? 1 - shiftCountdown.totalMs / COUNTDOWN_DISPLAY_THRESHOLD_MS : 0;
  const breakProgress = dashboard?.activeBreak
    ? 1 - breakCountdown.totalMs / (dashboard.activeBreak.durationAllowedMins * 60_000)
    : 0;

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

  const content = useMemo(() => {
    if (!dashboard) return null;

    if (dashboard.state === "NO_SHIFT") {
      return (
        <View className="items-center pt-12">
          <View className="h-56 w-56 items-center justify-center self-center rounded-full border-[10px] border-slate-light/60">
            <Text className="text-lg font-semibold text-slate-dark">No shift</Text>
          </View>
        </View>
      );
    }

    if (dashboard.state === "SHIFT_SCHEDULED" && shift) {
      if (!withinStartWindow) {
        return (
          <View className="items-center gap-6 pt-12">
            <View className="h-56 w-56 items-center justify-center self-center rounded-full border-[10px] border-slate-light/60">
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
        <View className="gap-6 pt-4">
          <ProgressRing label="Shift starts in" value={formatHoursMinutes(shiftCountdown.totalMs)} progress={shiftProgress} />
          <Button label="Start shift" onPress={handleStartShift} />
          <Text className="rounded-lg bg-ink px-4 py-3 text-center text-sm text-white">
            After starting your shift, kindly make sure to leave the depot as soon as possible.
          </Text>
          <View className="flex-row gap-3">
            <AssetCard plateCode={shift.asset?.plateCode ?? "—"} />
            <ZoneCard zoneName={shift.zone?.name ?? "—"} />
          </View>
        </View>
      );
    }

    if (dashboard.state === "ON_DUTY" && shift) {
      return (
        <View className="gap-6">
          <View className="flex-row gap-3">
            <AssetCard plateCode={shift.asset?.plateCode ?? "—"} />
            <ZoneCard zoneName={shift.zone?.name ?? "—"} />
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
                {groupTasksByOrder(todaysJobsQuery.data.items).map((group) => (
                  <Pressable
                    key={group.orderId}
                    onPress={() => navigation.navigate("OrderDetail", { orderId: group.orderId })}
                    className="rounded-xl border border-slate-light/60 p-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-medium text-ink">{group.serviceName}</Text>
                      {group.tasks.length > 1 && (
                        <View className="rounded-full bg-indigo/10 px-2 py-0.5">
                          <Text className="text-xs font-semibold text-indigo">{group.tasks.length} vehicles</Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-0.5 text-xs text-slate-dark">
                      {new Date(group.scheduledStartTime).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(group.scheduledEndTime).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {group.addressLabel}
                    </Text>
                    {group.tasks.length > 1 && (
                      <Text className="mt-1 text-xs text-slate-dark" numberOfLines={1}>
                        {group.tasks.map((t) => `${t.vehicle.make} ${t.vehicle.model}`).join(", ")}
                      </Text>
                    )}
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
          <ProgressRing label="Break remaining" value={formatHoursMinutes(breakCountdown.totalMs)} progress={breakProgress} />
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
        {isOnDuty && profileQuery.data && (
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-indigo/10">
                <Text className="font-bold text-indigo">{profileQuery.data.firstName[0]}</Text>
              </View>
              <Text className="font-semibold text-ink">{profileQuery.data.code}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="font-medium text-ink">On duty</Text>
              <Switch
                value={true}
                onValueChange={() => setBreakModalVisible(true)}
                trackColor={{ true: "#3652D9", false: "#C3C9D6" }}
              />
            </View>
          </View>
        )}

        {totalFailed > 0 && (
          <Text
            onPress={() => navigation.navigate("SyncErrors")}
            className="mb-3 rounded-lg bg-rust/10 px-3 py-2 text-center text-sm font-medium text-rust"
          >
            {totalFailed} item{totalFailed > 1 ? "s" : ""} need attention — tap to review
          </Text>
        )}
        {totalFailed === 0 && totalSyncing > 0 && (
          <Text className="mb-3 rounded-lg bg-amber/10 px-3 py-2 text-center text-sm font-medium text-amber">
            Syncing {totalSyncing} item{totalSyncing > 1 ? "s" : ""}…
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