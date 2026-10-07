export type OrderStatus =
  | "PLACED"
  | "PREPARING"
  | "READY"
  | "COLLECTED"
  | "CANCELLED"
  | string;

export interface OrderHistoryItem {
  orderId: number;
  pickupCode: string;
  orderStatus: OrderStatus;
  totalAmount: number;
  orderedAt: string;
  startTime: string;
  endTime: string;
}

export interface QueueOrder {
  orderId: number;
  pickupCode: string;
  orderStatus: OrderStatus;
  totalAmount: number;
  orderedAt: string;
}

export interface PlaceOrderItem {
  menuItemId: number;
  quantity: number;
}

export interface PlaceOrderRequest {
  pickupWindowId: number;
  items: PlaceOrderItem[];
}

export interface PlaceOrderResponse {
  orderId: number;
  pickupCode: string;
  totalAmount: number;
}
