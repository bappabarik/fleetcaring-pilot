import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { decode as base64Decode } from "base-64";

interface PilotProfile {
  sub: string;
  actorType: "PILOT";
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  profile: PilotProfile | null;
  /** False until the persisted refresh token has been read from
   * SecureStore — the app shows a splash rather than the sign-in screen
   * during this brief window, since a genuinely signed-in pilot should
   * never flash a login screen on cold start. */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clear: () => Promise<void>;
}

const REFRESH_TOKEN_KEY = "fleetcaring_pilot_refresh_token";

/** Decodes the JWT payload without verifying it — verification is the
 * server's job; this is purely to read `sub`/`actorType` for UI use. */
function decodeJwtPayload(token: string): PilotProfile | null {
  try {
    const payloadB64 = token.split(".")[1];
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(base64Decode(normalized));
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  profile: null,
  hydrated: false,

  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    set({ refreshToken: stored, hydrated: true });
  },

  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    set({ accessToken, refreshToken, profile: decodeJwtPayload(accessToken) });
  },

  clear: async () => {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ accessToken: null, refreshToken: null, profile: null });
  },
}));
