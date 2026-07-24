import { apiRequest } from "./client";

export interface MyShipmentTaskCard {
  shipmentId: string;
  shipmentNumber: string;
  status: string;
  order: {
    id: string;
    orderNumber: string;
    totalAED: string;
  };
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  customer: {
    name: string | null;
    phoneNumber: string;
  };
  address: {
    label: string;
    addressText: string;
    latitude: number;
    longitude: number;
    notes: string | null;
    zoneName: string | null;
  };
  vehicle: {
    make: string;
    model: string;
    licensePlate: string;
    color: string;
  };
  service: {
    name: string;
    opItemName: string;
    addOns: string[];
  };
  hasOpenIssue: boolean;
}

export interface ListMyShipmentsParams {
  [key: string]: string | number | boolean | undefined;
  date?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export const shipmentsApi = {
  listMine: (params: ListMyShipmentsParams) =>
    apiRequest<{ items: MyShipmentTaskCard[]; nextCursor: string | null }>("/shipments/mine", { query: params }),
};