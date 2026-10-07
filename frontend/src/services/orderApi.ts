import { apiRequest } from "./api";
import type {
  OrderHistoryItem,
  PlaceOrderRequest,
  PlaceOrderResponse,
  QueueOrder,
} from "../types/order";

interface OrderHistoryResponse {
  orders: OrderHistoryItem[];
}

interface QueueResponse {
  pickupWindowId: number;
  queue: QueueOrder[];
}

export async function fetchOrderHistory(
  token: string,
): Promise<OrderHistoryItem[]> {
  const data = await apiRequest<OrderHistoryResponse>(
    "/orders/history",
    {},
    token,
  );

  return data.orders ?? [];
}

export async function cancelOrder(
  token: string,
  orderId: number,
): Promise<void> {
  await apiRequest(
    `/orders/${orderId}/cancel`,
    {
      method: "POST",
    },
    token,
  );
}

export async function placeOrder(
  token: string,
  request: PlaceOrderRequest,
): Promise<PlaceOrderResponse> {
  return apiRequest<PlaceOrderResponse>(
    "/orders",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    token,
  );
}

export async function fetchPickupQueue(
  token: string,
  pickupWindowId: number,
): Promise<QueueOrder[]> {
  const data = await apiRequest<QueueResponse>(
    `/orders/queue?pickupWindowId=${pickupWindowId}`,
    {},
    token,
  );

  return data.queue ?? [];
}

export async function updateOrderStatus(
  token: string,
  orderId: number,
  status: string,
): Promise<void> {
  await apiRequest(
    `/orders/${orderId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    token,
  );
}
