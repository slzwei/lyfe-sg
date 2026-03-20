"use client";

import { createClient } from "./client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const CHANNEL_NAME = "candidate-progress";

let channel: RealtimeChannel | null = null;
let subscribed = false;

function getChannel() {
  if (!channel) {
    const supabase = createClient();
    channel = supabase.channel(CHANNEL_NAME);
    channel.subscribe((status) => {
      subscribed = status === "SUBSCRIBED";
    });
  }
  return channel;
}

/** Broadcast a progress event to the staff portal (fire-and-forget). */
export function broadcastProgress() {
  const ch = getChannel();
  if (subscribed) {
    ch.send({ type: "broadcast", event: "progress", payload: {} });
  }
}

/**
 * Subscribe to progress broadcasts. Returns an unsubscribe function.
 * Used by the staff portal to listen for candidate activity.
 */
export function onProgress(callback: () => void): () => void {
  const supabase = createClient();
  const ch = supabase.channel(CHANNEL_NAME);

  ch.on("broadcast", { event: "progress" }, () => callback()).subscribe();

  return () => {
    supabase.removeChannel(ch);
  };
}
