import { apiRequest } from "./client";

export interface ApiPayment {
  id: string;
  orderId: string;
  provider: string;
  status: "PENDING" | "HOLD_SUCCESS" | "CAPTURED" | "FAILED" | "REFUNDED";
  amount: string;
  providerRef: string | null;
  createdAt: string;
}

export const paymentsApi = {
  collectCod: (orderId: string, idempotencyKey: string) =>
    apiRequest<ApiPayment>(`/payments/${orderId}/cod/collect`, { method: "POST", idempotencyKey }),
};
