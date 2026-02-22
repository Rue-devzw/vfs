"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useValleyAI } from "../hooks/use-valley-ai";
import { ChatWindow } from "./ChatWindow";
import { AnimatePresence } from "framer-motion";

export function ValleyAIAssistant() {
    const {
        isOpen,
        inputValue,
        messages,
        isResponding,
        resourcesExpanded,
        hasUnread,
        endRef,
        inputRef,
        toggleAssistant,
        toggleResources,
        sendMessage,
        handleInputChange,
        handleFormSubmit,
        lastUserQuestion,
        clearHistory,
    } = useValleyAI();

    return (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-3 sm:bottom-6 sm:left-6">
            <AnimatePresence>
                {isOpen && (
                    <ChatWindow
                        isOpen={isOpen}
                        onClose={toggleAssistant}
                        onClearHistory={clearHistory}
                        messages={messages}
                        isResponding={isResponding}
                        inputValue={inputValue}
                        onInputChange={handleInputChange}
                        onSubmit={handleFormSubmit}
                        onPromptSelect={sendMessage}
                        resourcesExpanded={resourcesExpanded}
                        onToggleResources={toggleResources}
                        hasUserMessages={messages.some((m) => m.role === "user")}
                        lastUserQuestion={lastUserQuestion}
                        endRef={endRef}
                        inputRef={inputRef}
                    />
                )}
            </AnimatePresence>

            <button
                type="button"
                onClick={toggleAssistant}
                className={cn(
                    "relative flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    hasUnread && !isOpen ? "ring-2 ring-emerald-400/70" : "",
                )}
                aria-expanded={isOpen}
                aria-label={isOpen ? "Hide Valley AI assistant" : "Open Valley AI assistant"}
            >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
                <span>{isOpen ? "Hide Valley AI" : "Chat with Valley AI"}</span>
                {hasUnread && !isOpen ? (
                    <>
                        <span className="sr-only">Valley AI has a fresh update for you</span>
                        <span
                            className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-emerald-400"
                            aria-hidden="true"
                        />
                        <span
                            className="absolute -right-1.5 -top-1.5 h-3 w-3 animate-ping rounded-full bg-emerald-400/70"
                            aria-hidden="true"
                        />
                    </>
                ) : null}
            </button>
        </div>
    );
}
