export interface MenuItem {
  menuItemId: number;
  itemName: string;
  description?: string;
  price: number;
  isAvailable: string;
  stockQuantity?: number;
  ingredients?: string[];
  dietaryLabels?: string[];
  allergenLabels?: string[];
}

/**
 * A menu item is available to students only when it is enabled
 * and has at least one portion remaining.
 */
export function isMenuItemAvailable(item: MenuItem): boolean {
  return item.isAvailable === "Y" && Number(item.stockQuantity ?? 0) > 0;
}

export interface PickupWindow {
  pickupWindowId: number;
  startTime: string;
  endTime: string;
  capacity: number;
  reservedCount: number;
  availableCapacity: number;
}

export interface MenuResponse {
  date: string;
  items: MenuItem[];
  pickupWindows?: PickupWindow[];
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface AdminMenuDate {
  menuDateId: number;
  menuDate: string;
  isPublished: string;
  itemCount: number;
}

export interface AdminMenuResponse {
  menuDateId: number;
  menuDate: string;
  isPublished: string;
  items: MenuItem[];
}

export interface Ingredient {
  ingredientId: number;
  ingredientName: string;
}

export interface CreateMenuDateRequest {
  menuDate: string;
  isPublished: string;
}

export interface CreateIngredientRequest {
  ingredientName: string;
}

export interface CreateMenuItemRequest {
  menuDateId: number;
  itemName: string;
  description: string;
  price: number;
  isAvailable: string;
  stockQuantity: number;
  ingredientIds: number[];
}

export interface UpdateMenuItemRequest {
  itemName: string;
  description: string;
  price: number;
  isAvailable: string;
}

export interface UpdateStockRequest {
  availableQty: number;
}

export interface UpdateIngredientsRequest {
  ingredientIds: number[];
}
