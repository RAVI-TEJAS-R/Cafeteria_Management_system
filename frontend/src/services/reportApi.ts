export interface DailyOrderSummary {
  orderDate: string;
  totalOrders: number;
  totalSales: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface MenuStockStatus {
  menuDate?: string;
  menuItemId?: number;
  itemName: string;
  stockQuantity: number;
  isAvailable: string;
}

export interface OrderDetail {
  orderId: number;
  fullName?: string;
  email?: string;
  pickupCode?: string;
  orderStatus: string;
  totalAmount: number;
  startTime?: string;
  endTime?: string;
  orderedAt?: string;
  cancelledAt?: string;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface ReportData {
  dailySummary: DailyOrderSummary[];
  menuStock: MenuStockStatus[];
  orderDetails: OrderDetail[];
}

const API_BASE = "http://localhost:3000/api";

async function request<T>(
  token: string,
  path: string,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Unable to load reports.",
    );
  }

  return data as T;
}

export async function fetchDailyOrderSummary(
  token: string,
  date?: string,
): Promise<DailyOrderSummary[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const data = await request<
    | DailyOrderSummary[]
    | { rows?: DailyOrderSummary[]; summary?: DailyOrderSummary[] }
  >(token, `/reports/daily-order-summary${query}`);

  if (Array.isArray(data)) return data;
  return data.rows ?? data.summary ?? [];
}

export async function fetchMenuStockStatus(
  token: string,
  date?: string,
): Promise<MenuStockStatus[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const data = await request<
    | MenuStockStatus[]
    | { rows?: MenuStockStatus[]; stock?: MenuStockStatus[] }
  >(token, `/reports/menu-stock-status${query}`);

  if (Array.isArray(data)) return data;
  return data.rows ?? data.stock ?? [];
}

export async function fetchOrderDetails(
  token: string,
  date?: string,
): Promise<OrderDetail[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const data = await request<
    | OrderDetail[]
    | { rows?: OrderDetail[]; orders?: OrderDetail[] }
  >(token, `/reports/order-details${query}`);

  if (Array.isArray(data)) return data;
  return data.rows ?? data.orders ?? [];
}

export async function fetchReports(
  token: string,
  date: string,
): Promise<ReportData> {
  const [dailySummary, menuStock, orderDetails] = await Promise.all([
    fetchDailyOrderSummary(token, date),
    fetchMenuStockStatus(token, date),
    fetchOrderDetails(token, date),
  ]);

  return { dailySummary, menuStock, orderDetails };
}
