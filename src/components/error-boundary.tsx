"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-6 px-4 text-center">
                    <div className="rounded-full bg-destructive/10 p-4">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="font-headline text-3xl font-bold">Something went wrong</h2>
                        <p className="mx-auto max-w-md text-muted-foreground">
                            We encountered an unexpected error. Don&apos;t worry, your data is safe.
                            Please try refreshing the page or return to the home page.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Button onClick={() => window.location.reload()} variant="outline">
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Refresh Page
                        </Button>
                        <Button onClick={this.handleReset}>
                            Return Home
                        </Button>
                    </div>
                    {process.env.NODE_ENV === "development" && (
                        <div className="mt-8 w-full max-w-2xl overflow-auto rounded-lg bg-muted p-4 text-left text-xs font-mono text-destructive">
                            {this.state.error?.toString()}
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
