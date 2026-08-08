import { apiRequest } from "./client";

export type ShiftStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type DashboardState = "NO_SHIFT" | "SHIFT_SCHEDULED" | "ON_DUTY" | "ON_BREAK";
export type BreakReason = "LUNCH_BREAK" | "ACCIDENT" | "MECHANICAL_ISSUE" | "SICKNESS" | "RETURN_TO_DEPOT" | "OTHER";

export interface ShiftAsset {
  id: string;
  plateCode: string;
  name: string;
  type: string;
}

export interface ShiftZone {
  id: string;
  name: string;
  code: string;
}

export interface Shift {
  id: string;
  pilotId: string;
  assetId: string;
  zoneId: string;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  asset?: ShiftAsset;
  zone?: ShiftZone;
}

export interface ActiveBreak {
  id: string;
  reason: BreakReason;
  durationAllowedMins: number;
  startedAt: string;
  endedAt: string | null;
  remainingMins: number;
}

export interface PilotDashboard {
  state: DashboardState;
  shift: Shift | null;
  activeBreak: ActiveBreak | null;
}

export interface ListMyShiftsParams {
  [key: string]: string | number | boolean | undefined;
  limit?: number;
  cursor?: string;
}

export const shiftsApi = {
  getDashboard: () => apiRequest<PilotDashboard>("/shifts/me/dashboard"),

  start: (shiftId: string, idempotencyKey: string) =>
    apiRequest<Shift>(`/shifts/${shiftId}/start`, { method: "POST", idempotencyKey }),

  end: (shiftId: string, idempotencyKey: string) =>
    apiRequest<Shift>(`/shifts/${shiftId}/end`, { method: "POST", idempotencyKey }),

  startBreak: (shiftId: string, reason: BreakReason, idempotencyKey: string) =>
    apiRequest<ActiveBreak>(`/shifts/${shiftId}/breaks`, {
      method: "POST",
      body: { reason },
      idempotencyKey,
    }),

  endBreak: (shiftId: string, breakId: string, idempotencyKey: string) =>
    apiRequest<ActiveBreak>(`/shifts/${shiftId}/breaks/${breakId}/end`, {
      method: "POST",
      idempotencyKey,
    }),
  
  listMine: (params: ListMyShiftsParams) =>
  apiRequest<{ items: Shift[]; nextCursor: string | null }>("/shifts/me/list", { query: params }),
};