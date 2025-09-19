"use client";

import { useEffect, useRef, useState } from "react";
import { chatWithOnsiteAssistant } from "@/app/_actions/ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader2, Send, UserRound, AlertTriangle } from "lucide-react";
import type { OnsiteAssistantMessage } from "@/lib/assistant-types";

interface ChatMessage extends OnsiteAssistantMessage {
  id: string;
  needsEscalation?: boolean;
  escalationReason?: string | null;
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "assistant-initial",
  role: "assistant",
  content:
    "Hello! I'm the Valley Farm Secrets onsite assistant. Ask me about our services, store offers, wholesale support, or anything you spotted on the site.",
};

const QUICK_PROMPTS = [
  "What are your opening hours?",
  "Do you deliver wholesale orders outside Gweru?",
  "How can I pre-book my harvest as a producer?",
  "Tell me more about your butchery specials.",
];

export function OnsiteAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || isSending) {
      return;
    }

    const trimmedInput = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedInput,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsSending(true);

    try {
      const result = await chatWithOnsiteAssistant(
        updatedMessages.map(({ role, content }) => ({ role, content }))
      );

      if (!result.response) {
        throw new Error(result.error ?? "Assistant unavailable");
      }

      const assistantReply: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.response.reply,
        needsEscalation: result.response.needsEscalation,
        escalationReason: result.response.escalationReason,
      };

      setMessages(prev => [...prev, assistantReply]);
    } catch (error) {
      console.error("Assistant chat error", error);
      toast({
        title: "We're having trouble replying",
        description: "Please try again in a moment or use the WhatsApp helpline for urgent help.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }

  function handlePromptClick(prompt: string) {
    setInput(prompt);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl">
          <Bot className="h-6 w-6 text-primary" />
          Onsite Assistant
        </CardTitle>
        <CardDescription>
          Real-time guidance powered by Valley Farm Secrets' onsite knowledge. We'll escalate to our WhatsApp helpline and
          email team whenever you need extra attention.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(prompt => (
              <Button
                key={prompt}
                type="button"
                variant="secondary"
                size="sm"
                className="bg-primary/10 text-primary hover:bg-primary/20"
                onClick={() => handlePromptClick(prompt)}
                disabled={isSending}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[360px] w-full rounded-md border bg-background/60 p-4">
          <div className="space-y-4">
            {messages.map(message => (
              <div key={message.id} className="space-y-2">
                <div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
                      {message.role === "user" ? (
                        <UserRound className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5" />
                      )}
                      {message.role === "user" ? "You" : "Assistant"}
                    </div>
                    <p className="whitespace-pre-line text-left text-sm text-foreground">
                      {message.content}
                    </p>
                  </div>
                </div>
                {message.role === "assistant" && message.needsEscalation && (
                  <Alert className="ml-0 border-primary/40 bg-primary/10 text-sm text-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Forwarded for personal follow-up</AlertTitle>
                    <AlertDescription>
                      We've shared this chat with our WhatsApp helpline (+263 788 679 000 / +263 711 406 919) and emailed
                      info@valleyfarmsecrets.com so a team member can respond directly.
                      {message.escalationReason ? ` Reason: ${message.escalationReason}` : null}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="assistant-question" className="text-sm font-medium text-foreground">
            Ask your question
          </label>
          <Textarea
            id="assistant-question"
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question here..."
            rows={3}
            disabled={isSending}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              The assistant uses current Valley Farm Secrets information and escalates when you need a human response.
            </p>
            <Button type="submit" disabled={isSending || !input.trim()}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
