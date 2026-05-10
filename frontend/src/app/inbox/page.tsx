"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Check,
  ExternalLink,
  Inbox,
  MessageCircle,
  RefreshCw,
  Reply,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { inboxApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { InboxItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | "comment" | "message";
type StatusFilter = "all" | "unread" | "read" | "replied" | "archived" | "failed";

export default function InboxPage() {
  const qc = useQueryClient();
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["inbox", { type, status }],
    queryFn: () => inboxApi.list({ type, status, limit: 200 }),
  });
  const summaryQ = useQuery({
    queryKey: ["inbox", "summary"],
    queryFn: inboxApi.summary,
  });

  const syncM = useMutation({
    mutationFn: () => inboxApi.sync({ limit: 50 }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast.success("Inbox synced", {
        description: `${data.comments_imported} comments, ${data.messages_imported} messages.`,
      });
      if (data.warnings?.length) {
        toast.message("Inbox synced with notes", {
          description: data.warnings[0],
        });
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Sync failed"),
  });

  const items = query.data ?? [];
  const active = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [activeId, items],
  );

  return (
    <div className="space-y-5 pb-16">
      <PageHeader
        title="Inbox"
        subtitle="Meta Graph comments and Instagram messages in one response workspace."
        actions={
          <Button onClick={() => syncM.mutate()} disabled={syncM.isPending}>
            <RefreshCw className={cn("h-4 w-4", syncM.isPending && "animate-spin")} />
            {syncM.isPending ? "Syncing" : "Sync inbox"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total" value={summaryQ.data?.total ?? 0} />
        <Stat label="Unread" value={summaryQ.data?.unread ?? 0} tone="warning" />
        <Stat label="Comments" value={summaryQ.data?.comments ?? 0} />
        <Stat label="Messages" value={summaryQ.data?.messages ?? 0} />
        <Stat label="Replied" value={summaryQ.data?.replied ?? 0} tone="success" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Type"
            value={type}
            onChange={(value) => setType(value as TypeFilter)}
            options={["all", "comment", "message"]}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as StatusFilter)}
            options={["all", "unread", "read", "replied", "archived", "failed"]}
          />
          <p className="ms-auto text-xs text-fg-muted">
            Replies are sent through Meta Graph when permissions are available.
          </p>
        </div>
      </Card>

      {query.error ? (
        <Card className="border-warning/40 bg-warning/5">
          <div className="text-sm font-medium text-warning">Inbox storage is not ready</div>
          <p className="mt-1 text-sm text-fg-muted">
            Apply <span className="font-mono">backend/db/schema_v18.sql</span> in Supabase,
            then sync the inbox again.
          </p>
        </Card>
      ) : null}

      <div className="grid min-h-[620px] grid-cols-1 gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            Conversations
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            {query.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border-b border-border p-4">
                  <div className="h-4 w-2/3 rounded bg-surface-muted" />
                  <div className="mt-2 h-3 w-full rounded bg-surface-muted" />
                </div>
              ))
            ) : items.length ? (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "block w-full border-b border-border px-4 py-3 text-start transition-colors hover:bg-surface-muted",
                    active?.id === item.id && "bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.item_type === "comment" ? (
                      <MessageCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <Inbox className="h-4 w-4 text-primary" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {item.author_username ? `@${item.author_username}` : "Instagram user"}
                    </span>
                    {item.direction === "outbound" ? (
                      <Badge tone="neutral" size="sm">
                        sent
                      </Badge>
                    ) : null}
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{item.body}</p>
                  <p className="mt-2 text-[10px] text-fg-subtle">
                    {item.published_at ? formatDate(item.published_at, "en") : "No date"}
                  </p>
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <Inbox className="mx-auto h-8 w-8 text-fg-subtle" />
                <p className="mt-2 text-sm font-medium">No inbox items yet</p>
                <p className="mt-1 text-xs text-fg-muted">
                  Sync the inbox after applying the inbox database schema.
                </p>
              </div>
            )}
          </div>
        </Card>

        <ConversationPanel item={active} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning" | "success";
}) {
  return (
    <Card>
      <div className="text-xs text-fg-muted">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold",
          tone === "warning" && "text-warning",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </div>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </span>
      <select className="input h-9 min-w-[150px]" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: InboxItem["status"] }) {
  const tone =
    status === "unread" ? "warning" : status === "replied" ? "success" : "neutral";
  return (
    <Badge tone={tone} size="sm">
      {status}
    </Badge>
  );
}

function ConversationPanel({ item }: { item: InboxItem | null }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const replyM = useMutation({
    mutationFn: () => {
      if (!item) throw new Error("No selected item");
      return inboxApi.reply(item.id, reply);
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["inbox"] });
      toast.success("Reply sent");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Reply failed"),
  });

  const statusM = useMutation({
    mutationFn: (status: "read" | "archived") => {
      if (!item) throw new Error("No selected item");
      return inboxApi.markStatus(item.id, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inbox"] }),
  });

  if (!item) {
    return (
      <Card className="grid place-items-center">
        <div className="text-center">
          <Inbox className="mx-auto h-10 w-10 text-fg-subtle" />
          <p className="mt-3 text-sm font-medium">Select an inbox item</p>
          <p className="mt-1 text-xs text-fg-muted">Comments and messages appear here.</p>
        </div>
      </Card>
    );
  }

  const postCaption = item.social_posts?.caption || null;
  const canReply = item.direction === "inbound";

  return (
    <Card className="flex min-h-[620px] flex-col">
      <div className="border-b border-border pb-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary">
            {item.item_type === "comment" ? (
              <MessageCircle className="h-5 w-5" />
            ) : (
              <Inbox className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">
                {item.author_username ? `@${item.author_username}` : "Instagram user"}
              </h2>
              <StatusBadge status={item.status} />
              <Badge tone="neutral" size="sm">
                {item.item_type}
              </Badge>
              {item.direction === "outbound" ? (
                <Badge tone="neutral" size="sm">
                  sent history
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              {item.published_at ? formatDate(item.published_at, "en") : "No publish date"}
            </p>
          </div>
          {item.permalink ? (
            <Button variant="secondary" asChild>
              <a href={item.permalink} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-4 py-4">
        {postCaption ? (
          <div className="rounded-lg border border-border bg-surface-muted p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              Original post
            </div>
            <p className="mt-1 line-clamp-3 text-sm text-fg-muted">{postCaption}</p>
          </div>
        ) : null}

        <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-border bg-surface p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
            {item.direction === "outbound" ? "Sent" : "Incoming"} {item.item_type}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        {!canReply ? (
          <div className="mb-3 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-fg-muted">
            This item is sent history from your connected account. Select an inbound DM or comment to
            send a reply.
          </div>
        ) : null}
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          className="input min-h-[110px] w-full resize-none"
          disabled={!canReply}
          placeholder={
            !canReply
              ? "Replies are available only for inbound items."
              : item.item_type === "comment"
              ? "Reply publicly to this comment..."
              : "Reply to this Instagram message..."
          }
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => statusM.mutate("read")}>
              <Check className="h-4 w-4" />
              Mark read
            </Button>
            <Button variant="secondary" onClick={() => statusM.mutate("archived")}>
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          </div>
          <Button onClick={() => replyM.mutate()} disabled={!canReply || !reply.trim() || replyM.isPending}>
            {replyM.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : item.item_type === "comment" ? (
              <Reply className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {replyM.isPending ? "Sending" : "Send reply"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
