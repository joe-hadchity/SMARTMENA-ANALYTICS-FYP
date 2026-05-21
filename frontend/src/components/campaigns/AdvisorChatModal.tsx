"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import axios from "axios";
import { readWorkspaceId, readAuthToken } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { X, Send, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type AdvisorChatModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
};

const ADVISOR_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

// Helper function to format message content with basic markdown support
function formatMessage(content: string) {
  // Split by lines and format
  const lines = content.split('\n');
  return lines.map((line, idx) => {
    // Bold text (**text**)
    const boldFormatted = line.split(/(\*\*.*?\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    return (
      <div key={idx}>
        {boldFormatted}
      </div>
    );
  });
}

export default function AdvisorChatModal({
  open,
  onOpenChange,
  clientId = "c218eadd-6861-45b3-8fc3-8af5691d080c", // Default to demo client
}: AdvisorChatModalProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial greeting when modal opens
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "👋 Hi! I'm your AI Campaign Advisor. I'll help you create a high-performing Meta Ads campaign.\n\nTo give you the best recommendations, tell me:\n\n**1. What's your main goal?**\n• Awareness - Reach more people\n• Traffic - Drive website visits\n• Engagement - Get more interactions\n• Leads - Collect customer info\n• Sales - Drive purchases\n• App Promotion - Get app installs\n\n**2. What's your budget?** (e.g., $50/day or $1000 lifetime)\n\n**3. Who's your target audience?** (age, location, interests)\n\n**4. When should it run?** (start date, end date, or ongoing)\n\nProvide all 4 answers, and I'll give you smart recommendations! 🎯",
          timestamp: new Date(),
        },
      ]);
    }
  }, [open, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // Check if user is confirming campaign creation
      const isConfirmation = /^(yes|yep|yeah|sure|ok|okay|go ahead|create|proceed|let's do it|do it)$/i.test(userMessage.content.trim());

      // TODO: Extract campaign specs from conversation history when user confirms
      // For now, just send to advisor

      const url = `${ADVISOR_API_URL}/advisor-chat/chat`;
      console.log("Calling advisor at:", url);
      console.log("Message:", userMessage.content);

      const response = await axios.post(
        url,
        {
          message: userMessage.content,
          sessionId: sessionId || undefined,
          mode: "create_campaign", // Enable campaign creation mode
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;

      // Save session ID
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      // Add AI response
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If this was a confirmation, the advisor will have provided the specs
      // In a future enhancement, we could parse the response and call create-campaign API

    } catch (err) {
      console.error("Advisor API error:", err);
      setError(
        "Failed to connect to AI Advisor. Make sure the advisor backend is running on http://localhost:3001"
      );

      // Add error message
      const errorMessage: Message = {
        role: "assistant",
        content:
          "❌ I'm having trouble connecting to my backend. Please make sure the Advisor API is running on http://localhost:3001.\n\nYou can start it with:\n```bash\ncd Fyp/claude-sdk\nnpm start\n```",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(46% 0.108 320) 0%, oklch(54% 0.130 60) 100%)",
                }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">AI Campaign Advisor</DialogTitle>
                <p className="text-xs text-fg-muted">
                  Powered by Claude AI + Meta Marketing API
                </p>
              </div>
            </div>
            <button
              onClick={resetChat}
              className="text-fg-muted hover:text-fg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
          style={{ background: "oklch(var(--bg))" }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{ background: "oklch(46% 0.108 320)" }}
                >
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "rounded-br-sm"
                    : "rounded-bl-sm"
                )}
                style={{
                  background:
                    msg.role === "user"
                      ? "oklch(46% 0.108 320)"
                      : "oklch(var(--surface))",
                  color:
                    msg.role === "user" ? "white" : "oklch(var(--fg))",
                  border:
                    msg.role === "assistant"
                      ? "1px solid oklch(var(--border))"
                      : "none",
                }}
              >
                <div className="whitespace-pre-wrap break-words">
                  {formatMessage(msg.content)}
                </div>
                <div
                  className="text-[10px] mt-2 opacity-60"
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {msg.role === "user" && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                  style={{ background: "oklch(var(--surface-muted))" }}
                >
                  <span className="text-sm">👤</span>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 animate-in fade-in duration-300">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "oklch(46% 0.108 320)" }}
              >
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div
                className="rounded-2xl rounded-bl-sm px-4 py-3 border"
                style={{
                  background: "oklch(var(--surface))",
                  borderColor: "oklch(var(--border))",
                }}
              >
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              className="flex items-start gap-3 p-4 rounded-lg border animate-in fade-in duration-300"
              style={{
                background: "oklch(98% 0.02 60)",
                borderColor: "oklch(54% 0.130 60)",
              }}
            >
              <AlertCircle
                className="h-5 w-5 shrink-0 mt-0.5"
                style={{ color: "oklch(54% 0.130 60)" }}
              />
              <div className="text-sm" style={{ color: "oklch(44% 0.110 60)" }}>
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          className="px-6 py-4 border-t border-border shrink-0"
          style={{ background: "oklch(var(--surface))" }}
        >
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Press Enter to send)"
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "oklch(var(--bg))",
                  color: "oklch(var(--fg))",
                }}
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              size="lg"
              className="h-12 px-6"
              style={{
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, oklch(46% 0.108 320) 0%, oklch(50% 0.110 320) 100%)"
                  : undefined,
              }}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-fg-muted">
              💡 Tip: Be specific about your goals and budget for better recommendations
            </p>
            {sessionId && (
              <div className="flex items-center gap-1 text-xs text-fg-subtle">
                <CheckCircle className="h-3 w-3" />
                Connected
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
