"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Mail,
  MessageCircle,
  PhoneCall,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const quickActions = [
  {
    label: "Shop fresh produce",
    description: "Browse the Valley Farm Secrets store.",
    href: "/store",
  },
  {
    label: "Explore horticulture tips",
    description: "Learn how to grow with confidence.",
    href: "/horticulture-tips",
  },
  {
    label: "Meet our producers",
    description: "Discover the farms behind our harvests.",
    href: "/producers",
  },
  {
    label: "Become a partner",
    description: "Supply your produce through VFS.",
    href: "/become-a-partner",
  },
] as const;

const SUPPORT_EMAIL = "info@valleyfarmsecrets.com";
const SUPPORT_WHATSAPP = "+263788679000";

const createId = () => Math.random().toString(36).slice(2, 10);

export function VallieyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hi there! I’m Valliey, your AI-powered assistant. Ask me about produce, horticulture tips, deliveries, or partnerships, and I’ll guide you every step of the way.",
    },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages]);

  const toggleAssistant = () => {
    setIsOpen((previous) => !previous);
  };

  const escalationPrompt = useMemo(
    () =>
      encodeURIComponent(
        "Hello Valliey team! Could you please help me with a detailed request?",
      ),
    [],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = inputValue.trim();

    if (!trimmedMessage) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmedMessage,
    };

    const assistantReply: ChatMessage = {
      id: createId(),
      role: "assistant",
      content:
        "Thanks for sharing! I’ll pull together the best guidance from our store, producers, and horticulture experts. If you need a human to step in, you can escalate to WhatsApp or email right below.",
    };

    setMessages((previous) => [...previous, userMessage, assistantReply]);
    setInputValue("");
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-3">
      {isOpen ? (
        <div className="w-80 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="flex items-start justify-between gap-2 bg-primary/10 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Valliey</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Always-on support for Valley Farm Secrets
              </p>
            </div>
            <button
              type="button"
              onClick={toggleAssistant}
              className="rounded-full p-1 text-muted-foreground transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close Valliey assistant"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex max-h-64 flex-col gap-3 overflow-y-auto px-4 py-3 text-sm">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "assistant"
                    ? "justify-start"
                    : "justify-end",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed shadow-sm",
                    message.role === "assistant"
                      ? "bg-primary/10 text-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="space-y-3 border-t border-dashed px-4 py-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick help
              </p>
              <ul className="mt-2 grid grid-cols-1 gap-2">
                {quickActions.map((action) => (
                  <li key={action.href}>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-auto justify-start gap-2 py-2 text-left"
                    >
                      <Link href={action.href}>
                        <span className="block text-sm font-medium text-foreground">
                          {action.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {action.description}
                        </span>
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Need hands-on assistance? I can connect you to our team.
              </p>
              <div className="mt-2 flex flex-col gap-2">
                <Button
                  asChild
                  size="sm"
                  className="justify-between"
                  variant="secondary"
                >
                  <a
                    href={`https://wa.me/${SUPPORT_WHATSAPP.replace("+", "")}?text=${escalationPrompt}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4" aria-hidden="true" />
                      WhatsApp support
                    </span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="ghost" className="justify-between">
                  <a href={`mailto:${SUPPORT_EMAIL}`}>
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      Email support
                    </span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t bg-muted/30 px-4 py-3"
          >
            <label htmlFor="valliey-message" className="sr-only">
              Message Valliey
            </label>
            <Input
              id="valliey-message"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask about products, orders, or tips..."
              className="h-9 flex-1 rounded-full text-sm"
            />
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 rounded-full"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleAssistant}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-primary"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide Valliey assistant" : "Open Valliey assistant"}
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span>Chat with Valliey</span>
      </button>
    </div>
  );
}
