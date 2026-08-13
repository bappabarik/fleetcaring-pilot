import { apiRequest } from "./client";

export interface LocationPingBody {
  lat: number;
  lng: number;
  heading?: number | null;
  speedKph?: number | null;
}

export const realtimeApi = {
  sendLocationPing: (body: LocationPingBody) => apiRequest<void>("/realtime/location-ping", { method: "POST", body }),
};
