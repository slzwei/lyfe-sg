"use client";

import { useEffect } from "react";
import { broadcastProgress } from "@/lib/supabase/progress-broadcast";

export default function ResultsLive({ userId }: { userId: string }) {
  useEffect(() => {
    broadcastProgress(userId, "viewing-results");
  }, [userId]);

  return null;
}
