"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Sparkles,
  Send,
  Loader2,
  Trash2,
  Search,
  Pin,
  Copy,
  Check,
  TrendingUp,
  Zap,
  Target,
  Menu,
  X,
  Square
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/i18n/I18nProvider";
import { advisorChatApi, type AdvisorMessage } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Clean AI response by removing intermediate API call attempts and processing steps
 * Keeps only the final analysis and recommendations
 */
function cleanAIResponse(content: string): string {
  // Split by common section markers
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let skipMode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that look like intermediate API attempts
    if (
      line.startsWith("I'll pull") ||
      line.startsWith("I'll read") ||
      line.startsWith("I'll check") ||
      line.startsWith("Let me pull") ||
      line.startsWith("Let me read") ||
      line.startsWith("Let me check") ||
      line.startsWith("Let me see") ||
      line.startsWith("Let me analyze") ||
      line.match(/^(Pulling|Reading|Checking|Fetching|Getting|Loading)[\s\w]*\.\.\.$/i)
    ) {
      skipMode = true;
      continue;
    }

    // Stop skipping when we hit a real content section
    if (skipMode && (
      line.startsWith('##') || // Markdown heading
      line.startsWith('**') || // Bold text (usually section start)
      line.match(/^[A-Z][a-z]+:/) || // Label like "Problem:"
      line.match(/^\d+\./) // Numbered list
    )) {
      skipMode = false;
    }

    // Add line if not in skip mode
    if (!skipMode && line.trim()) {
      cleanedLines.push(line);
    }
  }

  return cleanedLines.join('\n').trim();
}

export default function AdvisorPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(null);
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotating thinking messages - fun and varied
  const thinkingMessages = useMemo(() => [
    t("advisor.thinking1", "Thinking..."),
    t("advisor.thinking2", "Processing..."),
    t("advisor.thinking3", "Analyzing..."),
    t("advisor.thinking4", "Computing..."),
    t("advisor.thinking5", "Brewing ideas..."),
    t("advisor.thinking6", "Hold on..."),
    t("advisor.thinking7", "Working on it..."),
    t("advisor.thinking8", "Give me a sec..."),
    t("advisor.thinking9", "Hmm..."),
    t("advisor.thinking10", "Let me see..."),
    t("advisor.thinking11", "Just a moment..."),
    t("advisor.thinking12", "Almost there..."),
  ], [t]);

  // Auto-focus on textarea when component mounts or new chat starts
  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeConversationId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // Fetch conversations list
  const conversationsQuery = useQuery({
    queryKey: ["advisor-conversations"],
    queryFn: () => advisorChatApi.listConversations({ limit: 20, status: "active", mode: "general" }),
  });

  // Fetch active conversation messages
  const activeConversationQuery = useQuery({
    queryKey: ["advisor-conversation", activeConversationId],
    queryFn: () => advisorChatApi.getConversation(activeConversationId!),
    enabled: !!activeConversationId,
  });

  const activeConversation = activeConversationQuery.data?.conversation;
  const messages = activeConversation?.messages || [];

  // Combine real messages with optimistic message
  const displayMessages = useMemo(() => {
    if (!optimisticMessage) return messages;

    // Add optimistic user message
    const optimisticMsg: AdvisorMessage = {
      id: 'optimistic-' + Date.now(),
      role: 'user',
      content: optimisticMessage,
      created_at: new Date().toISOString(),
      conversation_id: activeConversationId || 'new',
    };

    return [...messages, optimisticMsg];
  }, [messages, optimisticMessage, activeConversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, activeConversationId]);

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
      // Clear optimistic message
      setOptimisticMessage(null);

      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ["advisor-conversations"] });

      // Refresh active conversation
      if (data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["advisor-conversation", data.conversationId]
        });
        setActiveConversationId(data.conversationId);
      }
    },
    onError: () => {
      // Clear optimistic message on error
      setOptimisticMessage(null);
    },
  });

  // Rotate thinking messages while AI is responding
  useEffect(() => {
    if (!chatMutation.isPending) {
      setThinkingMessageIndex(0); // Reset to first message when not pending
      return;
    }

    const interval = setInterval(() => {
      setThinkingMessageIndex((prev) => (prev + 1) % thinkingMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [chatMutation.isPending, thinkingMessages.length]);

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

    // Store the message for optimistic display
    setOptimisticMessage(input);

    chatMutation.mutate({
      message: input,
      conversationId: activeConversationId || undefined,
    });

    // Clear input immediately for better UX
    setInput("");

    // Keep focus on textarea after sending
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleStopGeneration = () => {
    // Cancel the mutation
    queryClient.cancelQueries({ queryKey: ["advisor-conversation", activeConversationId] });
    setOptimisticMessage(null);
    textareaRef.current?.focus();
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

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus input
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      // Escape to clear input
      if (e.key === "Escape" && document.activeElement === textareaRef.current) {
        setInput("");
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

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

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!conversationsQuery.data?.conversations) return [];
    if (!searchQuery.trim()) return conversationsQuery.data.conversations;

    const query = searchQuery.toLowerCase();
    return conversationsQuery.data.conversations.filter(conv =>
      conv.title.toLowerCase().includes(query)
    );
  }, [conversationsQuery.data?.conversations, searchQuery]);

  // Context-aware suggested prompts
  const suggestions = useMemo(() => {
    const lastMessage = displayMessages[displayMessages.length - 1];

    // If last message mentions campaigns
    if (lastMessage?.content.toLowerCase().includes('campaign')) {
      return [
        { icon: Target, text: t("advisor.suggestOptimize", "How can I optimize this campaign?") },
        { icon: TrendingUp, text: t("advisor.suggestBudget", "What budget should I allocate?") },
        { icon: Zap, text: t("advisor.suggestAudience", "Who should I target?") },
      ];
    }

    // If last message mentions performance
    if (lastMessage?.content.toLowerCase().includes('performance')) {
      return [
        { icon: TrendingUp, text: t("advisor.suggestImprove", "How can I improve my metrics?") },
        { icon: Target, text: t("advisor.suggestCompare", "Compare my campaigns") },
        { icon: Sparkles, text: t("advisor.suggestTrends", "Show me trends") },
      ];
    }

    // Default suggestions
    return [
      { icon: Target, text: t("advisor.suggestion1", "Help me create a new awareness campaign") },
      { icon: TrendingUp, text: t("advisor.suggestion2", "What's the best budget for my next campaign?") },
      { icon: Sparkles, text: t("advisor.suggestion3", "Show me my campaign performance") },
    ];
  }, [displayMessages, t]);

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

  // Pastel purple color scheme
  const primaryColor = "oklch(70% 0.08 320)";
  const primaryGradient = "linear-gradient(135deg, oklch(70% 0.08 320) 0%, oklch(75% 0.09 310) 100%)";
  const primarySoft = "oklch(88% 0.04 320)";
  const stopButtonColor = "oklch(75% 0.09 330)"; // Light pastel purple for stop button
  const cardBg = "oklch(var(--card-bg))";
  const borderColor = "oklch(var(--border))";
  const surfaceMuted = "oklch(var(--surface-muted))";

  return (
    <div className="h-[calc(100vh-0px)] flex" style={{ background: "oklch(var(--bg))" }}>
      {/* Chat history sidebar */}
      <aside
        className={cn(
          "w-72 flex-shrink-0 flex flex-col border-e overflow-hidden transition-all duration-300",
          !sidebarOpen && "w-0 border-0"
        )}
        style={{
          borderColor: `${primaryColor}20`,
          background: `linear-gradient(180deg, ${primarySoft} 0%, ${cardBg} 100%)`
        }}
      >
        <div className="p-4 border-b space-y-3" style={{ borderColor: `${primaryColor}20` }}>
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
            style={{
              background: primaryGradient,
              color: "#fff",
            }}
          >
            <MessageCircle className="h-4 w-4" />
            {t("advisor.newChat", "New Chat")}
          </Button>

          {/* Search conversations */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("advisor.searchChats", "Search conversations...")}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-surface focus:outline-none focus:ring-2 transition-shadow"
              style={{
                borderColor: `${primaryColor}30`,
                "--tw-ring-color": primaryColor,
              } as React.CSSProperties}
            />
          </div>

          {/* Conversation stats */}
          <div className="flex gap-2 text-xs text-fg-muted">
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{conversationsQuery.data?.conversations.length || 0} chats</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversationsQuery.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 rounded-lg" style={{ background: surfaceMuted }}></div>
                </div>
              ))}
            </div>
          ) : !filteredConversations.length ? (
            <div className="text-center py-8 px-4 text-fg-muted text-sm">
              {searchQuery ? (
                <>
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  {t("advisor.noResults", "No conversations found")}
                </>
              ) : (
                <>
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  {t("advisor.noChats", "No chat history yet")}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative rounded-lg transition-all duration-200",
                    activeConversationId === conv.id
                      ? "shadow-sm ring-2"
                      : "hover:bg-surface-muted",
                  )}
                  style={activeConversationId === conv.id ? {
                    background: primarySoft,
                    "--tw-ring-color": primaryColor
                  } as React.CSSProperties : {}}
                >
                  <button
                    onClick={() => setActiveConversationId(conv.id)}
                    className="w-full text-start p-3"
                  >
                    <div className="font-medium text-sm truncate mb-1 pr-6">
                      {conv.title}
                    </div>
                    <div className="text-xs text-fg-muted flex items-center gap-2">
                      <span>{conv.message_count} {t("advisor.messages", "messages")}</span>
                      <span className="text-[10px]">•</span>
                      <span className="text-[10px]">
                        {formatRelativeTime(conv.last_message_at)}
                      </span>
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
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="px-6 py-4 border-b flex items-center gap-3"
          style={{ borderColor, background: cardBg }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-surface-muted rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div
            className="h-10 w-10 rounded-xl grid place-items-center shadow-sm"
            style={{ background: primaryGradient }}
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

          {/* Keyboard shortcut hint */}
          <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-fg-muted">
            <kbd className="px-2 py-1 rounded border" style={{ borderColor }}>⌘K</kbd>
            <span>to focus</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {!activeConversationId && !optimisticMessage ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4">
              {/* Animated empty state */}
              <div className="relative mb-6">
                <div
                  className="absolute inset-0 blur-2xl opacity-30 rounded-full"
                  style={{ background: primaryColor }}
                ></div>
                <div
                  className="relative h-20 w-20 rounded-2xl grid place-items-center shadow-lg"
                  style={{ background: primaryGradient }}
                >
                  <Sparkles className="h-10 w-10 text-white animate-pulse" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-fg to-fg-muted bg-clip-text text-transparent">
                {t("advisor.welcome", "Welcome to AI Advisor")}
              </h2>
              <p className="text-fg-muted text-sm mb-8 max-w-md">
                {t(
                  "advisor.welcomeDesc",
                  "Ask me anything about your campaigns, get optimization tips, or create new campaigns with AI assistance.",
                )}
              </p>

              {/* Enhanced suggestion cards */}
              <div className="grid gap-3 w-full max-w-lg">
                {suggestions.map((suggestion, i) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(suggestion.text);
                        textareaRef.current?.focus();
                      }}
                      className="group p-4 rounded-xl border text-sm hover:shadow-md transition-all duration-200 text-start flex items-start gap-3"
                      style={{ borderColor }}
                    >
                      <div
                        className="h-8 w-8 rounded-lg grid place-items-center flex-shrink-0 group-hover:scale-110 transition-transform"
                        style={{ background: `${primaryColor}15` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: primaryColor }} />
                      </div>
                      <span className="flex-1 pt-1">{suggestion.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick tips */}
              <div className="mt-8 p-4 rounded-lg border max-w-lg w-full" style={{ borderColor, background: surfaceMuted }}>
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                  <Zap className="h-3 w-3" style={{ color: primaryColor }} />
                  {t("advisor.quickTips", "Quick Tips")}
                </h3>
                <ul className="text-xs text-fg-muted space-y-1 text-start">
                  <li>• {t("advisor.tip1", "Ask about campaign performance and metrics")}</li>
                  <li>• {t("advisor.tip2", "Get budget recommendations based on your goals")}</li>
                  <li>• {t("advisor.tip3", "Request optimization strategies for better ROI")}</li>
                </ul>
              </div>
            </div>
          ) : (!activeConversationId && optimisticMessage) ? (
            // Show new conversation with optimistic message immediately
            <div className="max-w-3xl mx-auto space-y-6">
              {/* User's optimistic message */}
              <div className="flex gap-3 justify-end animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col gap-2 max-w-[80%]">
                  <div
                    className="rounded-2xl px-4 py-3 shadow-sm text-white"
                    style={{ background: primaryGradient }}
                  >
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {optimisticMessage}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-fg-subtle">
                      {t("advisor.justNow", "Just now")}
                    </span>
                  </div>
                </div>
                <div
                  className="h-8 w-8 rounded-lg grid place-items-center text-white text-sm font-medium flex-shrink-0 shadow-sm"
                  style={{ background: primarySoft }}
                >
                  U
                </div>
              </div>

              {/* AI thinking animation */}
              <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div
                  className="h-8 w-8 rounded-lg grid place-items-center flex-shrink-0 shadow-sm relative overflow-hidden"
                  style={{ background: primaryGradient }}
                >
                  {/* Rotating shimmer effect */}
                  <div
                    className="absolute inset-0 animate-spin"
                    style={{
                      background: "linear-gradient(transparent, rgba(255,255,255,0.3), transparent)",
                      animationDuration: "2s",
                    }}
                  />
                  <Sparkles className="h-4 w-4 text-white animate-pulse relative z-10" />
                </div>
                <div
                  className="rounded-2xl px-5 py-3 bg-surface border shadow-sm relative overflow-hidden"
                  style={{ borderColor }}
                >
                  {/* Animated gradient background */}
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, ${primaryColor} 50%, transparent 100%)`,
                      animation: "shimmer 2s infinite",
                      backgroundSize: "200% 100%",
                    }}
                  />

                  <div className="relative z-10 flex flex-col gap-3">
                    {/* Primary bouncing dots */}
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full animate-bounce shadow-sm"
                          style={{
                            background: primaryColor,
                            animationDelay: "0ms",
                            animationDuration: "1s"
                          }}
                        ></span>
                        <span
                          className="h-2.5 w-2.5 rounded-full animate-bounce shadow-sm"
                          style={{
                            background: primaryColor,
                            animationDelay: "150ms",
                            animationDuration: "1s"
                          }}
                        ></span>
                        <span
                          className="h-2.5 w-2.5 rounded-full animate-bounce shadow-sm"
                          style={{
                            background: primaryColor,
                            animationDelay: "300ms",
                            animationDuration: "1s"
                          }}
                        ></span>
                      </div>
                      <span className="text-sm text-fg-muted ml-1 animate-pulse">
                        {thinkingMessages[thinkingMessageIndex]}
                      </span>
                    </div>

                    {/* Animated progress bar */}
                    <div className="w-48 h-1 bg-surface-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: primaryGradient,
                          animation: "progress 2s ease-in-out infinite",
                        }}
                      />
                    </div>

                    {/* Pulsing particles */}
                    <div className="flex gap-1">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="h-1 w-1 rounded-full animate-pulse"
                          style={{
                            background: primaryColor,
                            opacity: 0.3,
                            animationDelay: `${i * 100}ms`,
                            animationDuration: "1.5s",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div ref={messagesEndRef} />
            </div>
          ) : activeConversationQuery.isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: primaryColor }} />
                <p className="text-sm text-fg-muted">{t("common.loading")}</p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {displayMessages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3 group relative animate-in fade-in slide-in-from-bottom-4 duration-500",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="h-8 w-8 rounded-lg grid place-items-center flex-shrink-0 shadow-sm"
                      style={{ background: primaryGradient }}
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 shadow-sm",
                        msg.role === "user"
                          ? "text-white"
                          : "bg-surface border",
                      )}
                      style={
                        msg.role === "user"
                          ? { background: primaryGradient }
                          : { borderColor }
                      }
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            children={cleanAIResponse(msg.content)}
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
                                <a className="underline hover:no-underline transition-all" style={{ color: primaryColor }} {...props} />
                              ),
                              p: ({ node, ...props }: any) => (
                                <p className="text-sm mb-2 last:mb-0 leading-relaxed" {...props} />
                              ),
                              ul: ({ node, ...props }: any) => (
                                <ul className="text-sm list-disc list-inside mb-2 space-y-1" {...props} />
                              ),
                              ol: ({ node, ...props }: any) => (
                                <ol className="text-sm list-decimal list-inside mb-2 space-y-1" {...props} />
                              ),
                              strong: ({ node, ...props }: any) => (
                                <strong className="font-semibold" style={{ color: primaryColor }} {...props} />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      )}
                    </div>

                    {/* Message actions */}
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] text-fg-subtle">
                        {formatRelativeTime(msg.created_at)}
                      </span>

                      {msg.role === "assistant" && (
                        <button
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-muted transition-all"
                          title={t("common.copy")}
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <Copy className="h-3 w-3 text-fg-muted" />
                          )}
                        </button>
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
                          className="shadow-sm"
                          style={{ background: primaryGradient, color: "#fff" }}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          View Campaign
                        </Button>
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div
                      className="h-8 w-8 rounded-lg grid place-items-center text-white text-sm font-medium flex-shrink-0 shadow-sm"
                      style={{ background: primarySoft }}
                    >
                      U
                    </div>
                  )}
                </div>
              ))}

              {/* Dynamic typing indicator with multiple animations */}
              {chatMutation.isPending && (
                <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div
                    className="h-8 w-8 rounded-lg grid place-items-center flex-shrink-0 shadow-sm relative overflow-hidden"
                    style={{ background: primaryGradient }}
                  >
                    {/* Rotating shimmer effect */}
                    <div
                      className="absolute inset-0 animate-spin"
                      style={{
                        background: "linear-gradient(transparent, rgba(255,255,255,0.3), transparent)",
                        animationDuration: "2s",
                      }}
                    />
                    <Sparkles className="h-4 w-4 text-white animate-pulse relative z-10" />
                  </div>
                  <div
                    className="rounded-2xl px-5 py-3 bg-surface border shadow-sm relative overflow-hidden"
                    style={{ borderColor }}
                  >
                    {/* Animated gradient background */}
                    <div
                      className="absolute inset-0 opacity-5"
                      style={{
                        background: `linear-gradient(90deg, transparent 0%, ${primaryColor} 50%, transparent 100%)`,
                        animation: "shimmer 2s infinite",
                        backgroundSize: "200% 100%",
                      }}
                    />

                    <div className="relative z-10 flex flex-col gap-3">
                      {/* Primary bouncing dots */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span
                            className="h-2.5 w-2.5 rounded-full animate-bounce shadow-sm"
                            style={{
                              background: primaryColor,
                              animationDelay: "0ms",
                              animationDuration: "1s"
                            }}
                          ></span>
                          <span
                            className="h-2.5 w-2.5 rounded-full animate-bounce shadow-sm"
                            style={{
                              background: primaryColor,
                              animationDelay: "150ms",
                              animationDuration: "1s"
                            }}
                          ></span>
                          <span
                            className="h-2.5 w-2.5 rounded-full animate-bounce shadow-sm"
                            style={{
                              background: primaryColor,
                              animationDelay: "300ms",
                              animationDuration: "1s"
                            }}
                          ></span>
                        </div>
                        <span className="text-sm text-fg-muted ml-1 animate-pulse">
                          {thinkingMessages[thinkingMessageIndex]}
                        </span>
                      </div>

                      {/* Animated progress bar */}
                      <div className="w-48 h-1 bg-surface-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: primaryGradient,
                            animation: "progress 2s ease-in-out infinite",
                          }}
                        />
                      </div>

                      {/* Pulsing particles */}
                      <div className="flex gap-1">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="h-1 w-1 rounded-full animate-pulse"
                            style={{
                              background: primaryColor,
                              opacity: 0.3,
                              animationDelay: `${i * 100}ms`,
                              animationDuration: "1.5s",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          className="p-4 border-t"
          style={{ borderColor, background: cardBg }}
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
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
                  className="w-full px-4 py-3 rounded-xl border bg-surface focus:outline-none focus:ring-2 transition-all resize-none min-h-[48px] max-h-[200px]"
                  style={{
                    borderColor,
                    "--tw-ring-color": primaryColor,
                  } as React.CSSProperties}
                  disabled={chatMutation.isPending}
                  rows={1}
                />
                {input.length > 0 && (
                  <span className="absolute bottom-2 right-3 text-[10px] text-fg-subtle">
                    {input.length}
                  </span>
                )}
              </div>
              {chatMutation.isPending ? (
                <Button
                  onClick={handleStopGeneration}
                  className="px-4 h-12 shadow-sm hover:shadow-md transition-all"
                  style={{
                    background: stopButtonColor,
                    color: "#fff",
                  }}
                  title={t("advisor.stopGeneration", "Stop generation")}
                >
                  <Square className="h-4 w-4" fill="currentColor" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-4 h-12 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: input.trim() ? primaryGradient : surfaceMuted,
                    color: input.trim() ? "#fff" : "var(--fg-muted)",
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="text-xs text-fg-muted">
                {t(
                  "advisor.inputHint",
                  "Press Enter to send · Shift+Enter for new line",
                )}
              </div>
              <div className="text-xs text-fg-muted">
                {t("advisor.escToClear", "ESC to clear")}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
