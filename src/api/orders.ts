import { apiRequest } from "./client";

export const ISSUE_REASONS = [
  "GATE_GARAGE_CLOSED",
  "NUMBER_PLATE_NOT_MATCHING",
  "UNABLE_TO_REACH_LOCATION",
  "VEHICLE_NOT_AVAILABLE",
  "VEHICLE_PARKED_UNSAFE_AREA",
  "BY_CONTROL_CENTRE",
  "ACCESS_DENIED_BY_SECURITY",
  "VEHICLE_IN_PAID_PARKING",
  "OTHER",
] as const;

export type IssueReason = (typeof ISSUE_REASONS)[number];

export interface OrderShipment {
  id: string;
  shipmentNumber: string;
  status: string;
  vehicle?: { make: string; model: string; licensePlate: string; color: string };
  itemVariation?: { name: string; priceAED: string };
  pilot?: { id: string; firstName: string; lastName: string; code: string } | null;
  asset?: { id: string; name: string; plateCode: string } | null;
  addOns: { id: string; itemVariationId: string; priceAED: string; itemVariation?: { name: string } }[];
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  totalAED: string;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  notes: { id: string; authorType: string; text: string }[];
  shipments: OrderShipment[];
  user?: { id: string; name: string | null; phoneNumber: string };
  address?: {
    id: string;
    label: string;
    addressText: string;
    latitude: number;
    longitude: number;
    notes: string | null;
    zone?: { id: string; name: string } | null;
  };
}

export interface RaiseIssueBody {
  shipmentId?: string;
  reason: IssueReason;
  notes?: string;
  photoUrls: string[];
}

export const ordersApi = {
  getById: (id: string) => apiRequest<OrderDetail>(`/orders/${id}`),

  enroute: (orderId: string, idempotencyKey: string) =>
    apiRequest<OrderDetail>(`/orders/${orderId}/enroute`, { method: "POST", idempotencyKey }),

  confirmArrival: (orderId: string, idempotencyKey: string) =>
    apiRequest<OrderDetail>(`/orders/${orderId}/confirm-arrival`, { method: "POST", idempotencyKey }),

  raiseIssue: (orderId: string, body: RaiseIssueBody, idempotencyKey: string) =>
    apiRequest(`/orders/${orderId}/issues`, { method: "POST", body, idempotencyKey }),

  complete: (orderId: string, idempotencyKey: string) =>
    apiRequest<OrderDetail>(`/orders/${orderId}/complete`, { method: "POST", idempotencyKey }),
};