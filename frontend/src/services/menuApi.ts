import { apiRequest } from "./api";
import type {
  AdminMenuDate,
  AdminMenuResponse,
  CreateIngredientRequest,
  CreateMenuDateRequest,
  CreateMenuItemRequest,
  Ingredient,
  MenuResponse,
  PickupWindow,
  UpdateIngredientsRequest,
  UpdateMenuItemRequest,
  UpdateStockRequest,
} from "../types/menu";



export interface CreatePickupWindowRequest {
  menuDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface UpdatePickupWindowRequest {
  startTime: string;
  endTime: string;
  capacity: number;
}

export async function fetchAdminPickupWindows(
  token: string,
  date: string,
): Promise<{ date: string; pickupWindows: PickupWindow[] }> {
  return apiRequest<{ date: string; pickupWindows: PickupWindow[] }>(
    `/menu/admin/pickup-windows?date=${encodeURIComponent(date)}`,
    {},
    token,
  );
}

export async function createPickupWindow(
  token: string,
  data: CreatePickupWindowRequest,
) {
  return apiRequest<{
    message: string;
    pickupWindowId: number;
    menuDate: string;
    startTime: string;
    endTime: string;
    capacity: number;
    reservedCount: number;
    availableCapacity: number;
  }>(
    "/menu/admin/pickup-windows",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function updatePickupWindow(
  token: string,
  pickupWindowId: number,
  data: UpdatePickupWindowRequest,
) {
  return apiRequest<{
    message: string;
    pickupWindowId: number;
    menuDate: string;
    startTime: string;
    endTime: string;
    capacity: number;
    reservedCount: number;
    availableCapacity: number;
  }>(
    `/menu/admin/pickup-windows/${pickupWindowId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function deletePickupWindow(
  token: string,
  pickupWindowId: number,
) {
  return apiRequest<{
    message: string;
    pickupWindowId: number;
  }>(
    `/menu/admin/pickup-windows/${pickupWindowId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function fetchMenu(
  token: string,
  date: string,
): Promise<MenuResponse> {
  return apiRequest<MenuResponse>(
    `/menu?date=${encodeURIComponent(date)}`,
    {},
    token,
  );
}

export async function fetchAdminMenuDates(
  token: string,
): Promise<{ dates: AdminMenuDate[] }> {
  return apiRequest<{ dates: AdminMenuDate[] }>(
    "/menu/admin/dates",
    {},
    token,
  );
}

export async function createMenuDate(
  token: string,
  data: CreateMenuDateRequest,
) {
  return apiRequest<{
    message: string;
    menuDateId: number;
    menuDate: string;
    isPublished: string;
  }>(
    "/menu/admin/dates",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function updateMenuDatePublication(
  token: string,
  menuDateId: number,
  isPublished: string,
) {
  return apiRequest<{
    message: string;
    menuDateId: number;
    isPublished: string;
  }>(
    `/menu/admin/dates/${menuDateId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isPublished }),
    },
    token,
  );
}

export async function fetchAdminMenu(
  token: string,
  date: string,
): Promise<AdminMenuResponse> {
  return apiRequest<AdminMenuResponse>(
    `/menu/admin?date=${encodeURIComponent(date)}`,
    {},
    token,
  );
}

export async function fetchIngredients(
  token: string,
): Promise<{ ingredients: Ingredient[] }> {
  return apiRequest<{ ingredients: Ingredient[] }>(
    "/menu/admin/ingredients",
    {},
    token,
  );
}

export async function createIngredient(
  token: string,
  data: CreateIngredientRequest,
) {
  return apiRequest<{
    message: string;
    ingredientId: number;
    ingredientName: string;
  }>(
    "/menu/admin/ingredients",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function createMenuItem(
  token: string,
  data: CreateMenuItemRequest,
) {
  return apiRequest<{
    message: string;
    menuItemId: number;
  }>(
    "/menu/admin/items",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function updateMenuItem(
  token: string,
  menuItemId: number,
  data: UpdateMenuItemRequest,
) {
  return apiRequest<{
    message: string;
    menuItemId: number;
  }>(
    `/menu/admin/items/${menuItemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function updateMenuItemStock(
  token: string,
  menuItemId: number,
  data: UpdateStockRequest,
) {
  return apiRequest<{
    message: string;
    menuItemId: number;
    availableQty: number;
  }>(
    `/menu/admin/items/${menuItemId}/stock`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token,
  );
}

export async function deleteMenuItem(
  token: string,
  menuItemId: number,
) {
  return apiRequest<{
    message: string;
    menuItemId: number;
  }>(
    `/menu/admin/items/${menuItemId}`,
    {
      method: "DELETE",
    },
    token,
  );
}

export async function updateMenuItemIngredients(
  token: string,
  menuItemId: number,
  data: UpdateIngredientsRequest,
) {
  return apiRequest<{
    message: string;
    menuItemId: number;
    ingredientIds: number[];
  }>(
    `/menu/admin/items/${menuItemId}/ingredients`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    token,
  );
}