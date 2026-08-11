import { useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { getPendingActions, markActionStatus, deleteAction, dispatchAction, PhotosNotReadyError } from "./actionQueue";
import { drainPhotoQueue } from "./photoQueue";
import { ApiError } from "@/api/client";

let isDraining = false;

export async function drainActionQueue(): Promise<void> {
  if (isDraining) return;
  isDraining = true;

  try {
    const pending = await getPendingActions();
    for (const action of pending) {
      try {
        await dispatchAction(action);
        await deleteAction(action.id);
      } catch (err) {
        if (err instanceof PhotosNotReadyError) {
          continue;
        }
        if (err instanceof ApiError) {
          await markActionStatus(action.id, "failed", err.message);
          continue;
        }
        return;
      }
    }
  } finally {
    isDraining = false;
  }
}

/**
 * Drains photos THEN actions, in that order. Any screen that just
 * enqueued a photo-carrying action (pre-check, post-check, raise issue)
 * should call this instead of drainActionQueue() alone — otherwise the
 * action just checks "are the photos already uploaded?", finds they
 * aren't yet, and silently waits for the next periodic background tick
 * (up to PERIODIC_DRAIN_INTERVAL_MS later) instead of actually pushing
 * the upload right now.
 */
export async function drainEverything(): Promise<void> {
  await drainPhotoQueue();
  await drainActionQueue();
}

const PERIODIC_DRAIN_INTERVAL_MS = 15_000;

export function useSyncEngine() {
  const queryClient = useQueryClient();
  const wasConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;
      if (isConnected && wasConnected.current === false) {
        drainEverything().then(() => queryClient.invalidateQueries());
      }
      wasConnected.current = isConnected;
    });

    const interval = setInterval(async () => {
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        await drainEverything();
      }
    }, PERIODIC_DRAIN_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [queryClient]);
}