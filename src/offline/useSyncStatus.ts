import { useQuery } from "@tanstack/react-query";
import { getPendingActions, getFailedActions } from "./actionQueue";
import { getUnresolvedPhotos, getFailedPhotos } from "./photoQueue";

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

  // Polled on the same 5s cadence as actions — this is what lets a
  // screen show "still uploading photos…" instead of going quiet the
  // moment a pre-check/post-check/issue is submitted.
  const unresolvedPhotosQuery = useQuery({
    queryKey: ["offline-unresolved-photos"],
    queryFn: getUnresolvedPhotos,
    refetchInterval: 5_000,
  });

  const failedPhotosQuery = useQuery({
    queryKey: ["offline-failed-photos"],
    queryFn: getFailedPhotos,
    refetchInterval: 5_000,
  });

  const unresolvedPhotos = unresolvedPhotosQuery.data ?? [];
  const failedPhotos = failedPhotosQuery.data ?? [];

  return {
    pendingCount: pendingQuery.data?.length ?? 0,
    failedCount: failedQuery.data?.length ?? 0,
    failedActions: failedQuery.data ?? [],
    uploadingPhotoCount: unresolvedPhotos.filter((p) => p.status !== "failed").length,
    failedPhotoCount: failedPhotos.length,
    failedPhotos,
  };
}