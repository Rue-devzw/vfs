"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ZesaSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-2">
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>

            <div className="space-y-4 pt-4">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            </div>

            <div className="pt-6">
                <Skeleton className="h-11 w-full rounded-full" />
            </div>

            <div className="flex justify-center pt-2">
                <Skeleton className="h-4 w-32" />
            </div>
        </div>
    );
}
