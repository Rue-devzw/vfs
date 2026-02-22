import { Sparkles, X, Send, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageList } from "./MessageList";
import { QuickPrompts } from "./QuickPrompts";
import { QuickActions } from "./QuickActions";
import { SupportPanel } from "./SupportPanel";
import { ChatMessage } from "../types";
import { motion } from "framer-motion";

interface ChatWindowProps {
    isOpen: boolean;
    onClose: () => void;
    onClearHistory: () => void;
    messages: ChatMessage[];
    isResponding: boolean;
    inputValue: string;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onPromptSelect: (prompt: string) => void;
    resourcesExpanded: boolean;
    onToggleResources: () => void;
    hasUserMessages: boolean;
    lastUserQuestion: string;
    endRef: React.RefObject<HTMLDivElement>;
    inputRef: React.RefObject<HTMLInputElement>;
}

export function ChatWindow({
    isOpen,
    onClose,
    onClearHistory,
    messages,
    isResponding,
    inputValue,
    onInputChange,
    onSubmit,
    onPromptSelect,
    resourcesExpanded,
    onToggleResources,
    hasUserMessages,
    lastUserQuestion,
    endRef,
    inputRef,
}: ChatWindowProps) {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="flex w-[min(88vw,18rem)] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:w-[19rem] md:w-[20rem]"
        >
            <div className="flex items-start justify-between gap-2 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-4 py-3">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Sparkles
                            className="h-4 w-4 text-primary motion-safe:animate-pulse"
                            aria-hidden="true"
                        />
                        <span>Valley AI</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Flexible support for everything on Valley Farm Secrets
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onClearHistory}
                        className="rounded-full p-1.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                        aria-label="Clear chat history"
                        title="Clear chat history"
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-muted-foreground transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="Close Valley AI assistant"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <MessageList
                messages={messages}
                isResponding={isResponding}
                endRef={endRef}
            />

            <div className="space-y-4 border-t border-dashed border-border/60 px-4 py-3 text-sm">
                <QuickPrompts onPromptSelect={onPromptSelect} />

                <QuickActions
                    resourcesExpanded={resourcesExpanded}
                    onToggle={onToggleResources}
                />

                {resourcesExpanded || hasUserMessages ? (
                    <SupportPanel lastUserQuestion={lastUserQuestion} />
                ) : null}
            </div>

            <form
                onSubmit={onSubmit}
                className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-muted/30"
            >
                <label htmlFor="valley-ai-message" className="sr-only">
                    Message Valley AI
                </label>
                <Input
                    id="valley-ai-message"
                    ref={inputRef}
                    value={inputValue}
                    onChange={onInputChange}
                    placeholder="Ask about products, orders, or tips..."
                    className="h-9 flex-1 rounded-full border border-border/60 bg-background/80 text-sm transition focus-visible:border-primary/60 focus-visible:ring-0"
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
        </motion.div>
    );
}
