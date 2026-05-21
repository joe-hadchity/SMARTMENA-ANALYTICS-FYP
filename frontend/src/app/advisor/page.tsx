"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Sparkles, Send, Loader2, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/i18n/I18nProvider";
import { advisorChatApi, type AdvisorMessage } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function AdvisorPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // Fetch conversations list
  const conversationsQuery = useQuery({
    queryKey: ["advisor-conversations"],
    queryFn: () => advisorChatApi.listConversations({ limit: 20 }),
  });

  // Fetch active conversation messages
  const activeConversationQuery = useQuery({
    queryKey: ["advisor-conversation", activeConversationId],
    queryFn: () => advisorChatApi.getConversation(activeConversationId!),
    enabled: !!activeConversationId,
  });

  const activeConversation = activeConversationQuery.data?.conversation;
  const messages = activeConversation?.messages || [];

  // Send message mutation
  const chatMutation = useMutation({
    mutationFn: async (input: { message: string; conversationId?: string }) => {
      return advisorChatApi.sendMessage({
        message: input.message,
        conversationId: input.conversationId,
        mode: "general",
      });
    },
    onSuccess: (data) => {
      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ["advisor-conversations"] });

      // Refresh active conversation
      if (data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["advisor-conversation", data.conversationId]
        });
        setActiveConversationId(data.conversationId);
      }

      setInput("");
    },
  });

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => advisorChatApi.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisor-conversations"] });
      setActiveConversationId(null);
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    chatMutation.mutate({
      message: input,
      conversationId: activeConversationId || undefined,
    });
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setInput("");
  };

  const handleDeleteConversation = (id: string) => {
    if (confirm(t("advisor.confirmDelete", "Delete this conversation permanently?"))) {
      deleteMutation.mutate(id);
    }
  };

  // Deep link handling from campaigns page
  const searchParams = useSearchParams();
  const campaignId = searchParams?.get('campaign');
  const campaignName = searchParams?.get('name');
  const alertText = searchParams?.get('alert');

  useEffect(() => {
    if (campaignId && campaignName && !activeConversationId) {
      const message = alertText
        ? `I need help with campaign "${campaignName}". ${alertText}`
        : `Tell me about campaign "${campaignName}" (ID: ${campaignId})`;
      setInput(message);
    }
  }, [campaignId, campaignName, alertText, activeConversationId]);

  // Context-aware suggested prompts
  const suggestions = useMemo(() => {
    const lastMessage = messages[messages.length - 1];

    // If last message mentions campaigns
    if (lastMessage?.content.toLowerCase().includes('campaign')) {
      return [
        t("advisor.suggestOptimize", "How can I optimize this campaign?"),
        t("advisor.suggestBudget", "What budget should I allocate?"),
        t("advisor.suggestAudience", "Who should I target?"),
      ];
    }

    // If last message mentions performance
    if (lastMessage?.content.toLowerCase().includes('performance')) {
      return [
        t("advisor.suggestImprove", "How can I improve my metrics?"),
        t("advisor.suggestCompare", "Compare my campaigns"),
        t("advisor.suggestTrends", "Show me trends"),
      ];
    }

    // Default suggestions
    return [
      t("advisor.suggestion1", "Help me create a new awareness campaign"),
      t("advisor.suggestion2", "What's the best budget for my next campaign?"),
      t("advisor.suggestion3", "Show me my campaign performance"),
    ];
  }, [messages, t]);

  // Helper function for relative time formatting
  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const messageDate = new Date(dateStr);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("advisor.justNow", "Just now");
    if (diffMins < 60) return `${diffMins}${t("advisor.minutesAgo", "m ago")}`;
    if (diffHours < 24) return `${diffHours}${t("advisor.hoursAgo", "h ago")}`;
    if (diffDays < 7) return `${diffDays}${t("advisor.daysAgo", "d ago")}`;

    return messageDate.toLocaleDateString(locale === "ar" ? "ar" : "en", {
      month: "short",
      day: "numeric",
    });
  };

  const primaryColor = "oklch(46% 0.108 320)";
  const cardBg = "oklch(var(--card-bg))";
  const borderColor = "oklch(var(--border))";

  return (
    <div className="h-screen flex" style={{ background: "oklch(var(--bg))" }}>
      {/* Chat history sidebar */}
      <aside
        className="w-72 flex-shrink-0 flex flex-col border-e overflow-hidden"
        style={{ borderColor, background: cardBg }}
      >
        <div className="p-4 border-b" style={{ borderColor }}>
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2"
            style={{
              background: primaryColor,
              color: "#fff",
            }}
          >
            <MessageCircle className="h-4 w-4" />
            {t("advisor.newChat", "New Chat")}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversationsQuery.isLoading ? (
            <div className="text-center py-8 px-4 text-fg-muted text-sm">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              {t("common.loading")}
            </div>
          ) : !conversationsQuery.data?.conversations.length ? (
            <div className="text-center py-8 px-4 text-fg-muted text-sm">
              {t("advisor.noChats", "No chat history yet")}
            </div>
          ) : (
            <div className="space-y-1">
              {conversationsQuery.data.conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative rounded-lg transition-colors",
                    activeConversationId === conv.id
                      ? "bg-surface shadow-sm"
                      : "hover:bg-surface-muted",
                  )}
                >
                  <button
                    onClick={() => setActiveConversationId(conv.id)}
                    className="w-full text-start p-3"
                  >
                    <div className="font-medium text-sm truncate mb-1 pr-6">
                      {conv.title}
                    </div>
                    <div className="text-xs text-fg-muted">
                      {conv.message_count} {t("advisor.messages", "messages")}
                    </div>
                    <div className="text-[10px] text-fg-subtle mt-1">
                      {new Date(conv.last_message_at).toLocaleString(
                        locale === "ar" ? "ar" : "en",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/10"
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header
          className="px-6 py-4 border-b flex items-center gap-3"
          style={{ borderColor, background: cardBg }}
        >
          <div
            className="h-10 w-10 rounded-lg grid place-items-center"
            style={{ background: primaryColor }}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">
              {t("advisor.title", "AI Advisor")}
            </h1>
            <p className="text-xs text-fg-muted">
              {t(
                "advisor.subtitle",
                "Get intelligent recommendations for your campaigns",
              )}
            </p>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {!activeConversationId ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div
                className="h-16 w-16 rounded-2xl grid place-items-center mb-4"
                style={{ background: primaryColor }}
              >
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {t("advisor.welcome", "Welcome to AI Advisor")}
              </h2>
              <p className="text-fg-muted text-sm mb-6">
                {t(
                  "advisor.welcomeDesc",
                  "Ask me anything about your campaigns, get optimization tips, or create new campaigns with AI assistance.",
                )}
              </p>
              <div className="grid gap-2 w-full text-start">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    className="p-3 rounded-lg border text-sm hover:bg-surface-muted transition-colors text-start"
                    style={{ borderColor }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : activeConversationQuery.isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 group relative",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="h-8 w-8 rounded-lg grid place-items-center flex-shrink-0"
                      style={{ background: primaryColor }}
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 max-w-[75%]">
                    <div
                      className={cn(
                        "rounded-xl px-4 py-3",
                        msg.role === "user"
                          ? "text-white"
                          : "bg-surface border",
                      )}
                      style={
                        msg.role === "user"
                          ? { background: primaryColor }
                          : { borderColor }
                      }
                    >
                      {msg.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          className="prose prose-sm max-w-none dark:prose-invert"
                          components={{
                            code: ({ node, inline, className, children, ...props }: any) => (
                              inline ? (
                                <code className="bg-surface-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <code className="block bg-surface-muted p-3 rounded-lg text-xs overflow-x-auto font-mono" {...props}>
                                  {children}
                                </code>
                              )
                            ),
                            a: ({ node, ...props }: any) => (
                              <a className="underline" style={{ color: primaryColor }} {...props} />
                            ),
                            p: ({ node, ...props }: any) => (
                              <p className="text-sm mb-2 last:mb-0" {...props} />
                            ),
                            ul: ({ node, ...props }: any) => (
                              <ul className="text-sm list-disc list-inside mb-2" {...props} />
                            ),
                            ol: ({ node, ...props }: any) => (
                              <ol className="text-sm list-decimal list-inside mb-2" {...props} />
                            ),
                            strong: ({ node, ...props }: any) => (
                              <strong className="font-semibold" {...props} />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}
                    </div>

                    {/* Quick actions for campaign creation */}
                    {msg.role === "assistant" && msg.campaign_created && msg.campaign_id && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            alert(`Campaign created: ${msg.campaign_id}`);
                          }}
                          style={{ background: primaryColor, color: "#fff" }}
                        >
                          ✓ View Campaign
                        </Button>
                      </div>
                    )}

                    {/* Timestamp - shows on hover */}
                    <span
                      className="text-[10px] text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity"
                      title={new Date(msg.created_at).toLocaleString()}
                    >
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </div>
                  {msg.role === "user" && (
                    <div
                      className="h-8 w-8 rounded-lg grid place-items-center text-white font-medium flex-shrink-0"
                      style={{ background: "oklch(60% 0.06 320)" }}
                    >
                      U
                    </div>
                  )}
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                  <div
                    className="h-8 w-8 rounded-lg grid place-items-center flex-shrink-0"
                    style={{ background: primaryColor }}
                  >
                    <Sparkles className="h-4 w-4 text-white animate-pulse" />
                  </div>
                  <div
                    className="rounded-xl px-4 py-3 bg-surface border flex items-center gap-2"
                    style={{ borderColor }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
                    <span className="text-sm text-fg-muted">
                      {t("advisor.thinking", "AI is thinking...")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="p-4 border-t"
          style={{ borderColor, background: cardBg }}
        >
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={t(
                "advisor.inputPlaceholder",
                "Ask me anything about your campaigns...",
              )}
              className="flex-1 px-4 py-3 rounded-lg border bg-surface focus:outline-none focus:ring-2 transition-shadow"
              style={{
                borderColor,
                "--tw-ring-color": primaryColor,
              } as React.CSSProperties}
              disabled={chatMutation.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              className="px-6"
              style={{
                background: primaryColor,
                color: "#fff",
                opacity: !input.trim() || chatMutation.isPending ? 0.5 : 1,
              }}
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-fg-muted text-center mt-2">
            {t(
              "advisor.inputHint",
              "Press Enter to send · Shift+Enter for new line",
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
