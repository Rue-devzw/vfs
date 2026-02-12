import { cn } from "@/lib/utils";
import { ChatMessage } from "../types";
import { motion } from "framer-motion";

interface MessageListProps {
    messages: ChatMessage[];
    isResponding: boolean;
    endRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({
    messages,
    isResponding,
    endRef,
}: MessageListProps) {
    return (
        <div
            className="flex min-h-[10rem] max-h-[min(50vh,18rem)] flex-col gap-3 overflow-y-auto px-4 py-3 text-sm sm:max-h-[20rem]"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={isResponding}
        >
            {messages.map((message) => (
                <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "flex",
                        message.role === "assistant" ? "justify-start" : "justify-end",
                    )}
                >
                    <div
                        className={cn(
                            "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed shadow-sm transition-all duration-200",
                            message.role === "assistant"
                                ? "bg-primary/10 text-foreground"
                                : "bg-primary text-primary-foreground",
                        )}
                    >
                        {message.content}
                    </div>
                </motion.div>
            ))}
            {isResponding ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                    role="status"
                    aria-live="polite"
                >
                    <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-xs text-muted-foreground shadow-sm">
                        <span className="flex items-center gap-1">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                            <span
                                className="h-2 w-2 animate-pulse rounded-full bg-primary"
                                style={{ animationDelay: "150ms" }}
                            />
                            <span
                                className="h-2 w-2 animate-pulse rounded-full bg-primary"
                                style={{ animationDelay: "300ms" }}
                            />
                        </span>
                        Valley AI is thinking…
                    </div>
                </motion.div>
            ) : null}
            <div ref={endRef} />
        </div>
    );
}
