"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { onProgress, type CandidateState } from "@/lib/supabase/progress-broadcast";

interface UseRealtimeProgressOptions {
  /** Called when a candidate's data should be refreshed from the DB. */
  onRefresh: (userId: string) => Promise<void>;
}

interface UseRealtimeProgressReturn {
  /** Whether the realtime channel is connected. */
  live: boolean;
  /** Map of userId → current live state from broadcast. */
  liveStates: Record<string, CandidateState>;
}

/**
 * Subscribes to candidate progress broadcasts via Supabase Realtime.
 * Debounces DB refresh calls per user (500ms) and auto-clears
 * "signed-out" states after 60 seconds.
 */
export function useRealtimeProgress({ onRefresh }: UseRealtimeProgressOptions): UseRealtimeProgressReturn {
  const [live, setLive] = useState(false);
  const [liveStates, setLiveStates] = useState<Record<string, CandidateState>>({});
  const debounceMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Stable refresh callback with debounce
  const refreshUser = useCallback((userId: string) => {
    const existing = debounceMap.current.get(userId);
    if (existing) clearTimeout(existing);

    debounceMap.current.set(userId, setTimeout(async () => {
      debounceMap.current.delete(userId);
      await onRefresh(userId);
    }, 500));
  }, [onRefresh]);

  // Subscribe to realtime broadcasts
  useEffect(() => {
    const unsub = onProgress(
      (payload) => {
        if (payload.userId && payload.state) {
          setLiveStates((prev) => ({ ...prev, [payload.userId]: payload.state }));
          // Only fetch from DB for states that change data
          if (payload.state === "quiz" || payload.state === "form") {
            refreshUser(payload.userId);
          }
          // Auto-clear "signed-out" after 1 minute
          if (payload.state === "signed-out") {
            setTimeout(() => {
              setLiveStates((prev) => {
                if (prev[payload.userId] !== "signed-out") return prev;
                const next = { ...prev };
                delete next[payload.userId];
                return next;
              });
            }, 60_000);
          }
        }
      },
      (connected) => setLive(connected)
    );

    // Track browser network state
    const goOffline = () => setLive(false);
    const goOnline = () => setLive(true);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      debounceMap.current.forEach((t) => clearTimeout(t));
      debounceMap.current.clear();
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      unsub();
    };
  }, [refreshUser]);

  return { live, liveStates };
}
