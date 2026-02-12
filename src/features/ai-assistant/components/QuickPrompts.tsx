import { Button } from "@/components/ui/button";
import { quickPromptOptions } from "../data/constants";

interface QuickPromptsProps {
    onPromptSelect: (prompt: string) => void;
}

export function QuickPrompts({ onPromptSelect }: QuickPromptsProps) {
    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick prompts
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {quickPromptOptions.map((option) => (
                    <Button
                        key={option.prompt}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 rounded-full border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                        onClick={() => onPromptSelect(option.prompt)}
                    >
                        {option.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
