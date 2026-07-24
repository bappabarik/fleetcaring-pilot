import { apiRequest } from "./client";

interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export const authApi = {
  requestOtp: (phoneNumber: string) =>
    apiRequest<{ status: string }>("/auth/pilot/otp/request", { method: "POST", body: { phoneNumber } }),

  verifyOtp: (phoneNumber: string, code: string) =>
    apiRequest<AuthTokenPair>("/auth/pilot/otp/verify", { method: "POST", body: { phoneNumber, code } }),

  loginWithPassword: (emailOrCode: string, password: string) =>
    apiRequest<AuthTokenPair>("/auth/pilot/login", { method: "POST", body: { emailOrCode, password } }),

  logout: (refreshToken: string) => apiRequest<void>("/auth/logout", { method: "POST", body: { refreshToken } }),
};
