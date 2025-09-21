"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Send,
  Sparkles,
  X,
  PhoneCall,
  Mail,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  author: "assistant" | "user";
  content: string;
}

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    author: "assistant",
    content:
      "Hi there! I'm Valliey, your shopping assistant. I can surface products, line up specials, and guide you through checkout.",
  },
  {
    id: "escalate",
    author: "assistant",
    content:
      "Need a person right away? Use the quick actions below to escalate any order or payment query to our WhatsApp or email helplines.",
  },
];

const quickPrompts = [
  {
    label: "Show flash deals",
    prompt: "Which flash deals are available to shop right now?",
  },
  {
    label: "Build my basket",
    prompt: "Can you help me build a basket for dinners this week?",
  },
  {
    label: "Track my order",
    prompt: "How do I track the status of my online order?",
  },
];

const escalationLinks = {
  whatsapp: "https://wa.me/263788679000?text=Hi%20Valliey%2C%20I%20need%20help%20with%20an%20order.",
  email: "mailto:support@valleyfarmsecrets.com?subject=Assistance%20needed%20from%20Valliey",
};

export function VallieyAssistant() {
  const pathname = usePathname();
  const isStoreExperience = pathname?.startsWith("/store") ?? false;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buttonPlacementClasses = isStoreExperience
    ? "bottom-4 right-24 sm:right-28 md:bottom-6 md:right-36"
    : "bottom-4 right-4 md:bottom-6 md:right-24";

  const panelPlacementClasses = isStoreExperience
    ? "bottom-24 right-4 sm:right-28 md:bottom-28 md:right-36"
    : "bottom-24 right-4 md:bottom-28 md:right-24";

  const continueShoppingHref = isStoreExperience ? "#store-products" : "/store#store-products";

  const highlightedSuggestion = useMemo(() => {
    const assistantMessages = messages.filter(message => message.author === "assistant");
    const index = assistantMessages.length % quickPrompts.length;
    return quickPrompts[index];
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen]);

  const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      author: "user",
      content: trimmedDraft,
    };

    setMessages(prev => [...prev, userMessage]);
    setDraft("");
    setIsThinking(true);

    timeoutRef.current = setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        author: "assistant",
        content: `I've taken note of \"${trimmedDraft}\". I can point you to the right aisle, spotlight best-sellers, or fast-track you to checkout. Use the quick actions if you'd like to escalate straight to the team.`,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsThinking(false);
    }, 500);
  };

  const handlePromptSelect = (prompt: string) => {
    setDraft(prompt);
  };

  const handleResetConversation = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMessages(initialMessages);
    setDraft("");
    setIsThinking(false);
  };

  return (
    <>
      <Button
        size="lg"
        className={cn(
          "group fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2",
          buttonPlacementClasses,
          isOpen ? "pointer-events-none scale-90 opacity-0" : "opacity-100"
        )}
        onClick={() => setIsOpen(true)}
        aria-label="Open Valliey assistant"
      >
        <Sparkles className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
      </Button>

      <div
        className={cn(
          "fixed z-40 w-[min(360px,calc(100vw-2rem))] max-w-sm transition-all duration-300 ease-out",
          panelPlacementClasses,
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-6 scale-95 opacity-0"
        )}
        aria-live="polite"
      >
        <Card className="overflow-hidden border border-primary/20 bg-background/95 shadow-2xl backdrop-blur">
          <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-gradient-to-r from-primary/15 via-background to-background/90 pb-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <MessageCircle className="h-4 w-4" />
                </span>
                Valliey
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Always-on support while you shop. Tell me what you&apos;re stocking up on and I&apos;ll guide you.
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleResetConversation}
                aria-label="Reset conversation"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
                aria-label="Close Valliey assistant"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4">
            <ScrollArea className="h-64 rounded-lg border border-border/60 bg-muted/10 p-3">
              <div className="space-y-3 text-sm">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
                      message.author === "assistant"
                        ? "bg-primary/10 text-foreground"
                        : "ml-auto bg-primary text-primary-foreground"
                    )}
                  >
                    {message.content.split("\n").map((segment, index) => (
                      <p key={`${message.id}-${index}`} className="leading-relaxed">
                        {segment}
                      </p>
                    ))}
                  </div>
                ))}
                {isThinking ? (
                  <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-primary/10 px-4 py-3 text-xs text-muted-foreground">
                    <div className="flex h-2 w-8 items-center justify-between">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
                    </div>
                    Valliey is preparing ideas…
                  </div>
                ) : null}
                <div ref={endOfMessagesRef} />
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick prompts</p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map(item => (
                  <Button
                    key={item.label}
                    variant={item.label === highlightedSuggestion.label ? "default" : "secondary"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => handlePromptSelect(item.prompt)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-3">
              <Textarea
                value={draft}
                onChange={event => setDraft(event.target.value)}
                placeholder="Tell Valliey what you're shopping for and she'll line it up…"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <Button type="submit" disabled={!draft.trim()}>
                  Send
                  <Send className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>
                  Minimise
                </Button>
              </div>
            </form>

            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order helplines</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline">
                  <a
                    href={escalationLinks.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <PhoneCall className="h-4 w-4" />
                    WhatsApp helpline
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={escalationLinks.email} className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email support
                  </a>
                </Button>
                <Button asChild variant="secondary" className="sm:col-span-2">
                  <a href={continueShoppingHref} className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Continue shopping
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
