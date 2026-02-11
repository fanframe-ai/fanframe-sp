import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HistoryEntry {
  id: string;
  result_image_url: string;
  shirt_id: string;
  created_at: string;
}

export function useGenerationHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    const userId = localStorage.getItem("vf_user_id");
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("generation_queue")
        .select("id, result_image_url, shirt_id, created_at")
        .eq("user_id", userId)
        .eq("status", "completed")
        .not("result_image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setEntries(data as HistoryEntry[]);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { entries, isLoading, refresh: fetchHistory };
}
