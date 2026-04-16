"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ThreadMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Props = {
  connectionId: string;
  initialMessages: ThreadMessage[];
  currentUserId: string;
  peerLabel: string;
};

export function ConnectionThread({
  connectionId,
  initialMessages,
  currentUserId,
  peerLabel,
}: Props) {
  const [items, setItems] = useState<ThreadMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [items],
  );

  useEffect(() => {
    setItems(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sorted.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${connectionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const row = payload.new as ThreadMessage;
          setItems((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [connectionId]);

  const send = async () => {
    const body = text.trim();
    if (body.length === 0 || body.length > 5000) return;
    setSending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }
    const { data, error } = await supabase
      .from("messages")
      .insert({
        connection_id: connectionId,
        sender_id: user.id,
        content: body,
      })
      .select("id, sender_id, content, created_at")
      .maybeSingle();

    setSending(false);
    if (error) {
      console.error("[messages] insert", error);
      return;
    }
    if (data) {
      setItems((prev) => [...prev, data as ThreadMessage]);
      setText("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          sorted.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "border bg-background"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {mine ? "You" : peerLabel} ·{" "}
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Write a message…"
          value={text}
          maxLength={5000}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="button" disabled={sending || !text.trim()} onClick={() => void send()}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
