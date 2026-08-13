import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { LOCATION_TASK_NAME } from "./locationTask";

const LOCATION_PING_INTERVAL_MS = 15_000;
const LOCATION_PING_DISTANCE_METERS = 25;

/**
 * Starts/stops a background-capable location watch keyed off `enabled`
 * (on duty or on break). Once "Always" permission is granted, this
 * keeps reporting through backgrounding — app minimized, screen off,
 * pilot switched to another app — on both platforms, not just while
 * FleetCaring is the foreground app. Delivery goes over plain HTTP
 * (realtimeApi.sendLocationPing, called from locationTask.ts), not the
 * websocket — a background task gets a short wake window per location
 * fix and can't reliably keep a socket alive across suspend cycles.
 *
 * This does NOT survive the pilot force-quitting the app. No library —
 * not this, not the paid third-party ones — can promise that on iOS:
 * per Apple's own developer support guidance, a user swiping an app away
 * is treated as explicit intent to stop it, and the OS will not relaunch
 * it in the background until the user reopens it themselves. Android is
 * more permissive in principle (a proper foreground service can survive
 * a swipe-kill) but real-world reliability still depends on the phone's
 * own battery-optimization behavior.
 */
export function useLocationPing(enabled: boolean) {
  const isStartingOrRunningRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (isStartingOrRunningRef.current) {
        isStartingOrRunningRef.current = false;
        Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
      }
      return;
    }

    let cancelled = false;

    async function start() {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.status !== "granted" || cancelled) return;

      // iOS requires foreground permission to already be granted before
      // this can be requested — order matters here. If the pilot only
      // grants "While Using" and declines this, we still proceed below:
      // foreground-only tracking is a real, working degraded mode, not a
      // hard failure.
      await Location.requestBackgroundPermissionsAsync();
      if (cancelled) return;

      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (alreadyRunning) {
        isStartingOrRunningRef.current = true;
        return;
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_PING_INTERVAL_MS,
        distanceInterval: LOCATION_PING_DISTANCE_METERS,
        // Android requires a persistent, user-visible notification for
        // any background location tracking — this isn't optional and
        // can't be hidden, it's an OS-level requirement.
        foregroundService: {
          notificationTitle: "FleetCaring — On duty",
          notificationBody: "Tracking your location for this shift.",
        },
      });
      if (cancelled) return;
      isStartingOrRunningRef.current = true;
    }

    start();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
