import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { useAuthStore } from "@/store/authStore";
import { realtimeApi } from "@/api/realtime";

export const LOCATION_TASK_NAME = "fleetcaring-pilot-location-task";

/**
 * Registered at module scope (imported once, for its side effect, from
 * App.tsx) rather than inside a component — this is a hard requirement
 * from expo-task-manager: when the OS wakes the app specifically to run
 * a background task, it spins up just enough JS to execute registered
 * tasks without mounting any views, so the definition has to already
 * exist at that point, not be created by a component's render.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations[locations.length - 1];
  if (!latest) return;

  // This can run in a freshly spun-up JS context that never went through
  // App.tsx's normal mount/hydrate flow — the auth store's access token
  // is in-memory only (only the refresh token is persisted, see
  // authStore.ts), so make sure that's actually loaded before trying to
  // send anything. apiRequest's own 401 handling exchanges it for a
  // fresh access token as needed.
  if (!useAuthStore.getState().hydrated) {
    await useAuthStore.getState().hydrate();
  }
  if (!useAuthStore.getState().refreshToken) return; // never logged in, or logged out

  try {
    await realtimeApi.sendLocationPing({
      lat: latest.coords.latitude,
      lng: latest.coords.longitude,
      heading: latest.coords.heading,
      speedKph: latest.coords.speed != null ? latest.coords.speed * 3.6 : null,
    });
  } catch {
    // Best-effort — a dropped ping isn't worth surfacing anywhere; the
    // next location fix (governed by useLocationPing's timeInterval /
    // distanceInterval) just tries again.
  }
});
