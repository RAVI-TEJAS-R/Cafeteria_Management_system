import { useCallback, useState } from "react";
import type {
  AdminMenuDate,
  AdminMenuResponse,
  Ingredient,
  MenuResponse,
  PickupWindow,
} from "../types/menu";
import {
  fetchAdminMenu,
  fetchAdminMenuDates,
  fetchAdminPickupWindows,
  fetchIngredients,
  fetchMenu,
} from "../services/menuApi";

export function useMenu(token: string | null) {
  const [menuLoading, setMenuLoading] = useState(false);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [adminMenu, setAdminMenu] = useState<AdminMenuResponse | null>(null);
  const [menuDates, setMenuDates] = useState<AdminMenuDate[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pickupWindows, setPickupWindows] = useState<PickupWindow[]>([]);
  const [message, setMessage] = useState("");

  const loadMenu = useCallback(
    async (date?: string) => {
      if (!token) {
        return;
      }

      setMenuLoading(true);
      setMessage("");

      try {
        const selectedDate =
          date ?? new Date().toISOString().split("T")[0];

        const data = await fetchMenu(token, selectedDate);

        setMenu(data);

        return data;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to load the menu.";

        setMessage(errorMessage);
        throw error;
      } finally {
        setMenuLoading(false);
      }
    },
    [token],
  );

  const loadAdminMenu = useCallback(
    async (date: string) => {
      if (!token) {
        return;
      }

      setMenuLoading(true);
      setMessage("");

      try {
        const data = await fetchAdminMenu(token, date);

        setAdminMenu(data);

        return data;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to load the admin menu.";

        setMessage(errorMessage);
        throw error;
      } finally {
        setMenuLoading(false);
      }
    },
    [token],
  );

  const loadAdminMenuDates = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const data = await fetchAdminMenuDates(token);
      setMenuDates(data.dates);
      return data.dates;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to load menu dates.";

      setMessage(errorMessage);
      throw error;
    }
  }, [token]);

  const loadAdminPickupWindows = useCallback(
    async (date: string) => {
      if (!token) {
        return;
      }

      try {
        const data = await fetchAdminPickupWindows(token, date);
        setPickupWindows(data.pickupWindows);
        return data.pickupWindows;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unable to load pickup windows.";

        setMessage(errorMessage);
        throw error;
      }
    },
    [token],
  );

  const loadIngredients = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const data = await fetchIngredients(token);
      setIngredients(data.ingredients);
      return data.ingredients;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to load ingredients.";

      setMessage(errorMessage);
      throw error;
    }
  }, [token]);

  return {
    menu,
    setMenu,

    adminMenu,
    setAdminMenu,

    menuDates,
    setMenuDates,

    ingredients,
    setIngredients,

    pickupWindows,
    setPickupWindows,

    menuLoading,
    message,
    setMessage,

    loadMenu,
    loadAdminMenu,
    loadAdminMenuDates,
    loadAdminPickupWindows,
    loadIngredients,
  };
}