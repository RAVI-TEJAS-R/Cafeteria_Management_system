import { useCallback, useEffect, useState } from "react";
import {
  fetchReports,
  type ReportData,
} from "../services/reportApi";

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function useReports(token: string) {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [reports, setReports] = useState<ReportData>({
    dailySummary: [],
    menuStock: [],
    orderDetails: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(
    async (date = selectedDate) => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchReports(token, date);
        setReports(data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load reports.",
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedDate, token],
  );

  useEffect(() => {
    void loadReports(selectedDate);
  }, [loadReports, selectedDate]);

  return {
    selectedDate,
    setSelectedDate,
    reports,
    loading,
    error,
    loadReports,
  };
}
