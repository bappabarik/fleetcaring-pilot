import { apiRequest } from "./client";

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

export const ordersApi = {
  getById: (id: string) => apiRequest<OrderDetail>(`/orders/${id}`),

  enroute: (orderId: string, idempotencyKey: string) =>
    apiRequest<OrderDetail>(`/orders/${orderId}/enroute`, { method: "POST", idempotencyKey }),

  confirmArrival: (orderId: string, idempotencyKey: string) =>
    apiRequest<OrderDetail>(`/orders/${orderId}/confirm-arrival`, { method: "POST", idempotencyKey }),
};