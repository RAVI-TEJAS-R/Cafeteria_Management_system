import { useCallback, useEffect, useRef, useState } from "react";
import type {
  OrderHistoryItem,
  PlaceOrderRequest,
  PlaceOrderResponse,
  QueueOrder,
} from "../types/order";
import {
  cancelOrder as cancelOrderRequest,
  fetchOrderHistory,
  fetchPickupQueue,
  placeOrder as placeOrderRequest,
  updateOrderStatus as updateOrderStatusRequest,
} from "../services/orderApi";

const ORDER_STATUS_POLL_MS = 10000;

function hasActiveOrder(orderList: OrderHistoryItem[]) {
  return orderList.some((order) => {
    const status = order.orderStatus.trim().toUpperCase();
    return status !== "COLLECTED" && status !== "CANCELLED";
  });
}

export function useOrders(token: string | null) {
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderHistoryMessage, setOrderHistoryMessage] = useState("");
  const fetchingRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    if (!token || fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoadingOrders(true);
    setOrderHistoryMessage("");

    try {
      const nextOrders = await fetchOrderHistory(token);
      setOrders(nextOrders);
    } catch (error) {
      console.error("Order history error:", error);
      setOrderHistoryMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to the backend.",
      );
    } finally {
      fetchingRef.current = false;
      setLoadingOrders(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setOrders([]);
      setOrderHistoryMessage("");
      return;
    }

    let cancelled = false;

    const refreshSilently = async () => {
      if (fetchingRef.current) {
        return;
      }

      try {
        const nextOrders = await fetchOrderHistory(token);

        if (!cancelled) {
          setOrders(nextOrders);
        }
      } catch (error) {
        console.error("Order status refresh error:", error);
      }
    };

    const intervalId = window.setInterval(() => {
      if (hasActiveOrder(orders)) {
        void refreshSilently();
      }
    }, ORDER_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, orders]);

  async function cancelOrder(orderId: number) {
    if (!token) {
      throw new Error("Please log in again.");
    }

    await cancelOrderRequest(token, orderId);
    await fetchOrders();
  }

  async function placeOrder(
    request: PlaceOrderRequest,
  ): Promise<PlaceOrderResponse> {
    if (!token) {
      throw new Error("Please log in again.");
    }

    const response = await placeOrderRequest(token, request);
    await fetchOrders();
    return response;
  }

  async function loadStaffQueue(
    pickupWindowId: number,
  ): Promise<QueueOrder[]> {
    if (!token) {
      return [];
    }

    return fetchPickupQueue(token, pickupWindowId);
  }

  async function updateOrderStatus(orderId: number, status: string) {
    if (!token) {
      throw new Error("Please log in again.");
    }

    await updateOrderStatusRequest(token, orderId, status);
  }

  return {
    orders,
    loadingOrders,
    orderHistoryMessage,
    fetchOrders,
    cancelOrder,
    placeOrder,
    loadStaffQueue,
    updateOrderStatus,
  };
}
