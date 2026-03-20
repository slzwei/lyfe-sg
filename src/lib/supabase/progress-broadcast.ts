"use client";

import { createClient } from "./client";

const CHANNEL_NAME = "candidate-progress";

/** Lazily creates & subscribes a channel. Resolves once connected. */
let ready: Promise<ReturnType<ReturnType<typeof createClient>["channel"]>> | null = null;

function getSenderChannel() {
  if (!ready) {
    const supabase = createClient();
    const ch = supabase.channel(CHANNEL_NAME);
    ready = new Promise((resolve) => {
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve(ch);
      });
    });
  }
  return ready;
}

/** Broadcast a progress event to the staff portal (fire-and-forget). */
export function broadcastProgress() {
  getSenderChannel().then((ch) => {
    ch.send({ type: "broadcast", event: "progress", payload: {} });
  });
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
