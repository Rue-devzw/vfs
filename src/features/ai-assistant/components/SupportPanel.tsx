import { ArrowUpRight, Mail, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    EMAIL_SUBJECT,
    SUPPORT_EMAIL,
    SUPPORT_WHATSAPP,
} from "../data/constants";
import { useMemo } from "react";

interface SupportPanelProps {
    lastUserQuestion: string;
}

export function SupportPanel({ lastUserQuestion }: SupportPanelProps) {
    const escalationPrompt = useMemo(() => {
        const base =
            "Hello Valley Farm Secrets team! Valley AI could use a hand with a detailed request.";
        const body = lastUserQuestion
            ? `${base}\n\nCustomer shared: "${lastUserQuestion}"`
            : base;

        return encodeURIComponent(body);
    }, [lastUserQuestion]);

    const emailBody = useMemo(() => {
        const lines = [
            "Hi Valley Farm Secrets team,",
            "",
            "Please assist with this enquiry from the Valley AI assistant.",
        ];

        if (lastUserQuestion) {
            lines.push("", `Customer said: "${lastUserQuestion}"`);
        }

        lines.push("", "Thank you!");

        return encodeURIComponent(lines.join("\n"));
    }, [lastUserQuestion]);

    return (
        <div className="rounded-2xl bg-muted/30 p-3 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
            <p className="font-medium text-muted-foreground">
                {lastUserQuestion
                    ? "Need a teammate to take it from here? I can brief them with our chat history."
                    : "Ready when you are to connect you to the team with a full context summary."}
            </p>
            <div className="mt-2 flex flex-col gap-2">
                <Button
                    asChild
                    size="sm"
                    className="justify-between rounded-xl px-3 py-2 text-sm shadow-sm transition hover:shadow-md"
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
                <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="justify-between rounded-xl px-3 py-2 text-sm hover:bg-muted/60"
                >
                    <a
                        href={`mailto:${SUPPORT_EMAIL}?subject=${EMAIL_SUBJECT}&body=${emailBody}`}
                    >
                        <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4" aria-hidden="true" />
                            Email support
                        </span>
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                </Button>
            </div>
        </div>
    );
}
