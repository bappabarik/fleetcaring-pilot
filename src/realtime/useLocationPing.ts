import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { useAuthStore } from "@/store/authStore";

const LOCATION_PING_INTERVAL_MS = 15_000;
const LOCATION_PING_DISTANCE_METERS = 25;

function getWsUrl(accessToken: string): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/realtime/connect?token=${encodeURIComponent(accessToken)}`;
}

export function useLocationPing(enabled: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<WebSocket | null>(null);
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    let cancelled = false;

    async function start() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      const socket = new WebSocket(getWsUrl(accessToken!));
      socketRef.current = socket;

      socket.onopen = async () => {
        if (cancelled) return;
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: LOCATION_PING_INTERVAL_MS,
            distanceInterval: LOCATION_PING_DISTANCE_METERS,
          },
          (location) => {
            if (socket.readyState !== WebSocket.OPEN) return;
            socket.send(
              JSON.stringify({
                type: "location_ping",
                lat: location.coords.latitude,
                lng: location.coords.longitude,
                heading: location.coords.heading,
                speedKph: location.coords.speed != null ? location.coords.speed * 3.6 : null,
              })
            );
          }
        );
        watchSubscriptionRef.current = subscription;
      };

      socket.onerror = () => {
        // Silent — best-effort tracking, not critical to the pilot's work.
      };
    }

    start();

    return () => {
      cancelled = true;
      watchSubscriptionRef.current?.remove();
      watchSubscriptionRef.current = null;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, accessToken]);
}