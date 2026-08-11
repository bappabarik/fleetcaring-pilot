import { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { shiftsApi, type Shift } from "@/api/shifts";
import { shipmentsApi } from "@/api/shipments";
import { groupTasksByOrder } from "@/lib/groupTasksByOrder";

type Tab = "daily" | "weekly";

export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(iso: string, dateOnly: string): boolean {
  return iso.split("T")[0] === dateOnly;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDayHeading(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function ScheduleScreen() {
  const [tab, setTab] = useState<Tab>("daily");
  const today = todayIsoDate();

  const shiftsQuery = useQuery({
    queryKey: ["my-shifts"],
    queryFn: () => shiftsApi.listMine({ limit: 50 }),
  });

  const shipmentsQuery = useQuery({
    queryKey: ["my-shipments", today],
    queryFn: () => shipmentsApi.listMine({ date: today, limit: 50 }),
    enabled: tab === "daily",
    // Matches HomeScreen's own jobs query — same reasoning, polling since
    // there's no websocket for order data.
    refetchInterval: 20_000,
  });

  const sortedShifts = useMemo(
    () => [...(shiftsQuery.data?.items ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [shiftsQuery.data]
  );

  const todaysShift = sortedShifts.find((s) => isSameDay(s.startTime, today));

  // Grouped by order — one order can hold several vehicles (multiple
  // shipments) for the same customer/address/timeslot, and should read
  // as one entry on the timeline, not one per vehicle. Mirrors
  // HomeScreen's own "Today's jobs" list so the two screens agree.
  const taskGroupsForToday = useMemo(() => {
    const sorted = [...(shipmentsQuery.data?.items ?? [])].sort((a, b) =>
      a.scheduledStartTime.localeCompare(b.scheduledStartTime)
    );
    return groupTasksByOrder(sorted);
  }, [shipmentsQuery.data]);

  const shiftsByDate = useMemo(() => {
    const groups = new Map<string, Shift[]>();
    for (const shift of sortedShifts) {
      const key = shift.startTime.split("T")[0];
      const existing = groups.get(key) ?? [];
      existing.push(shift);
      groups.set(key, existing);
    }
    return [...groups.entries()];
  }, [sortedShifts]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 pt-4">
        <Text className="mb-4 text-xl font-bold text-ink">Schedule</Text>

        <View className="mb-4 flex-row rounded-xl bg-paper p-1">
          <Pressable
            onPress={() => setTab("daily")}
            className={`flex-1 items-center rounded-lg py-2.5 ${tab === "daily" ? "bg-white" : ""}`}
          >
            <Text className={`font-medium ${tab === "daily" ? "text-ink" : "text-slate-dark"}`}>Daily</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("weekly")}
            className={`flex-1 items-center rounded-lg py-2.5 ${tab === "weekly" ? "bg-white" : ""}`}
          >
            <Text className={`font-medium ${tab === "weekly" ? "text-ink" : "text-slate-dark"}`}>Weekly</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerClassName="pb-10">
        {tab === "daily" ? (
          <View className="gap-4">
            <Text className="text-center font-semibold text-ink">{formatDayHeading(today)}</Text>

            {todaysShift ? (
              <View className="flex-row rounded-xl bg-paper p-4">
                <View className="flex-1 items-center">
                  <Text className="text-xs text-slate-dark">Start</Text>
                  <Text className="font-semibold text-ink">{formatTime(todaysShift.startTime)}</Text>
                </View>
                <View className="flex-1 items-center">
                  <Text className="text-xs text-slate-dark">End</Text>
                  <Text className="font-semibold text-ink">{formatTime(todaysShift.endTime)}</Text>
                </View>
              </View>
            ) : (
              <Text className="text-center text-sm text-slate-dark">No shift scheduled today</Text>
            )}

            <View className="mt-2">
              {shipmentsQuery.isLoading ? (
                <Text className="text-center text-sm text-slate-dark">Loading jobs…</Text>
              ) : taskGroupsForToday.length === 0 ? (
                <Text className="text-center text-sm text-slate-dark">No jobs scheduled today</Text>
              ) : (
                taskGroupsForToday.map((group, index) => (
                  <View key={group.orderId} className="flex-row gap-3">
                    <View className="items-center">
                      <View className="mt-1.5 h-2.5 w-2.5 rounded-full bg-indigo" />
                      {index < taskGroupsForToday.length - 1 && <View className="w-px flex-1 bg-slate-light" />}
                    </View>
                    <View className="mb-4 flex-1 rounded-xl border border-slate-light/60 p-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-semibold uppercase text-indigo">{group.serviceName}</Text>
                        {group.tasks.length > 1 && (
                          <View className="rounded-full bg-indigo/10 px-2 py-0.5">
                            <Text className="text-xs font-semibold text-indigo">{group.tasks.length} vehicles</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-sm text-ink">
                        {formatTime(group.scheduledStartTime)} – {formatTime(group.scheduledEndTime)}
                      </Text>
                      {group.tasks.length > 1 && (
                        <Text className="mt-1 text-xs text-slate-dark" numberOfLines={1}>
                          {group.tasks.map((t) => `${t.vehicle.make} ${t.vehicle.model}`).join(", ")}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : (
          <View className="gap-4">
            {shiftsQuery.isLoading ? (
              <Text className="text-center text-sm text-slate-dark">Loading…</Text>
            ) : shiftsByDate.length === 0 ? (
              <Text className="text-center text-sm text-slate-dark">No shifts scheduled</Text>
            ) : (
              shiftsByDate.map(([date, shifts]) => (
                <View key={date} className="rounded-xl border border-slate-light/60 p-4">
                  <Text className="mb-2 font-semibold text-ink">{formatDayHeading(date)}</Text>
                  {shifts.map((shift) => (
                    <Text key={shift.id} className="text-sm text-slate-dark">
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                      {shift.zone ? ` · ${shift.zone.name}` : ""}
                    </Text>
                  ))}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}