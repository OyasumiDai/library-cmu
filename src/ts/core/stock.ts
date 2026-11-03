// Live stock. The database tells everyone watching the public "library-stock" channel whenever a book is
// reserved, borrowed, returned or its copies change, so the website and the game always agree.
import type { StockEvent } from "../types";
import { db, isConfigured } from "./supabase";

export function watchStock(onChange: (event: StockEvent) => void): () => void {
  if (!isConfigured()) return () => undefined;
  const client = db();
  const channel = client
    .channel("library-stock")
    .on("broadcast", { event: "stock" }, (message) => onChange(message.payload as StockEvent))
    .subscribe();
  return () => void client.removeChannel(channel);
}
