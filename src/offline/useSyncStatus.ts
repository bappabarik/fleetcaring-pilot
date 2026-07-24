import { useQuery } from "@tanstack/react-query";
import { getPendingActions, getFailedActions } from "./actionQueue";

export function useSyncStatus() {
  const pendingQuery = useQuery({
    queryKey: ["offline-pending-actions"],
    queryFn: getPendingActions,
    refetchInterval: 5_000,
  });

  const failedQuery = useQuery({
    queryKey: ["offline-failed-actions"],
    queryFn: getFailedActions,
    refetchInterval: 5_000,
  });

  return {
    pendingCount: pendingQuery.data?.length ?? 0,
    failedCount: failedQuery.data?.length ?? 0,
    failedActions: failedQuery.data ?? [],
  };
}