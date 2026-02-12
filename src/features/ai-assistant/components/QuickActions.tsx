import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { quickActions } from "../data/constants";

interface QuickActionsProps {
    resourcesExpanded: boolean;
    onToggle: () => void;
}

export function QuickActions({ resourcesExpanded, onToggle }: QuickActionsProps) {
    const primaryQuickActions = quickActions.slice(0, 2);
    const extraQuickActions = quickActions.slice(2);
    const visibleQuickActions = resourcesExpanded
        ? quickActions
        : primaryQuickActions;

    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Guided resources
            </p>
            <ul className="grid gap-2">
                {visibleQuickActions.map((action) => (
                    <li key={action.href} className="animate-in fade-in-up">
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="group h-auto w-full justify-between gap-2 rounded-2xl border-border/70 bg-background/70 px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                        >
                            <Link href={action.href}>
                                <span className="flex flex-1 flex-col text-left">
                                    <span className="text-sm font-medium text-foreground">
                                        {action.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {action.description}
                                    </span>
                                </span>
                                <ArrowUpRight
                                    className="h-4 w-4 shrink-0 text-primary opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </li>
                ))}
            </ul>
            {extraQuickActions.length ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    className="h-auto self-start px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                    {resourcesExpanded
                        ? "Show fewer guides"
                        : `More guides (${extraQuickActions.length})`}
                </Button>
            ) : null}
        </div>
    );
}
