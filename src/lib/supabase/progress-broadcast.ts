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
 * onStatus is called with true/false when the connection state changes.
 */
export function onProgress(
  callback: () => void,
  onStatus?: (connected: boolean) => void
): () => void {
  const supabase = createClient();
  const ch = supabase.channel(CHANNEL_NAME);

  ch.on("broadcast", { event: "progress" }, () => callback()).subscribe(
    (status) => {
      onStatus?.(status === "SUBSCRIBED");
    }
  );

  return () => {
    supabase.removeChannel(ch);
  };
}
