import { apiRequest } from "./client";

export type NavApp = "google_maps" | "waze" | "2gis";
export type Language = "en" | "ar";

export interface PilotProfile {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  status: string;
  preferredNavApp: NavApp;
  language: Language;
}

export interface UpdateMyProfileBody {
  preferredNavApp?: NavApp;
  language?: Language;
}

export const pilotsApi = {
  getMe: () => apiRequest<PilotProfile>("/pilots/me"),
  updateMe: (body: UpdateMyProfileBody) => apiRequest<PilotProfile>("/pilots/me", { method: "PATCH", body }),
};