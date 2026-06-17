import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { env } from "@/config/env";
import { STORAGE_KEYS } from "@/constants/storageKeys";

let client: SupabaseClient | null = null;

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabasePublishableKey) return null;

  const token = localStorage.getItem(STORAGE_KEYS.authToken) ?? "";

  if (client) {
    client.realtime.setAuth(token);
    return client;
  }

  client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 12,
      },
    },
  });

  if (token) {
    client.realtime.setAuth(token);
  }

  return client;
}

export function subscribeChatUpdates(
  onChange: () => void,
  conversationId?: string | null,
): () => void {
  const supabase = getSupabaseRealtimeClient();
  if (!supabase) return () => {};

  const channels: RealtimeChannel[] = [];

  const attach = (table: string, filter?: string) => {
    const channel = supabase
      .channel(
        `chat-${table}-${filter ?? "all"}-${Math.random().toString(36).slice(2)}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => onChange(),
      )
      .subscribe();
    channels.push(channel);
  };

  attach("chat_conversations");
  attach("chat_user_presence");
  attach(
    "chat_typing_signals",
    conversationId ? `conversation_id=eq.${conversationId}` : undefined,
  );
  attach(
    "chat_messages",
    conversationId ? `conversation_id=eq.${conversationId}` : undefined,
  );

  return () => {
    for (const channel of channels) {
      void supabase.removeChannel(channel);
    }
  };
}
