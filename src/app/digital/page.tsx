"use client";

import { Badge } from "@/components/ui/badge";
import { Zap, Tv, ShieldPlus, CreditCard, ChevronRight, HeartPulse } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DIGITAL_SERVICES } from "@/lib/digital-services";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import Image from "next/image";

const services = [
    {
        id: "zesa",
        title: DIGITAL_SERVICES.zesa.label,
        description: DIGITAL_SERVICES.zesa.description,
        icon: Zap,
        image: "/images/zetdc-logo.png",
        href: "/digital/zesa",
        bgClass: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40",
        borderClass: "group-hover:border-red-500/50 dark:group-hover:border-red-500/30",
        iconClass: "text-red-600 bg-red-100 dark:bg-red-500/20 dark:text-red-400",
        status: DIGITAL_SERVICES.zesa.status,
    },
    {
        id: "dstv",
        title: DIGITAL_SERVICES.dstv.label,
        description: DIGITAL_SERVICES.dstv.description,
        icon: Tv,
        image: "/images/dstv-logo.png",
        href: "/digital/dstv",
        bgClass: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40",
        borderClass: "group-hover:border-blue-500/50 dark:group-hover:border-blue-500/30",
        iconClass: "text-blue-600 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400",
        status: DIGITAL_SERVICES.dstv.status,
    },
    {
        id: "nyaradzo",
        title: DIGITAL_SERVICES.nyaradzo.label,
        description: DIGITAL_SERVICES.nyaradzo.description,
        icon: ShieldPlus,
        image: "/images/nyaradzo-logo.png",
        href: "/digital/nyaradzo",
        bgClass: "bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-950/40 dark:to-violet-900/40",
        borderClass: "group-hover:border-indigo-500/50 dark:group-hover:border-indigo-500/30",
        iconClass: "text-indigo-600 bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400",
        status: DIGITAL_SERVICES.nyaradzo.status,
    },
    {
        id: "cimas",
        title: DIGITAL_SERVICES.cimas.label,
        description: DIGITAL_SERVICES.cimas.description,
        icon: HeartPulse,
        image: "/images/cimas-logo.svg",
        href: "/digital/cimas",
        bgClass: "bg-gradient-to-br from-emerald-50 to-sky-100 dark:from-emerald-950/40 dark:to-sky-900/40",
        borderClass: "group-hover:border-emerald-500/50 dark:group-hover:border-emerald-500/30",
        iconClass: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400",
        status: DIGITAL_SERVICES.cimas.status,
    },
];

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function DigitalDashboard() {
    return (
        <div className="w-full pb-16 font-sans text-foreground">
            <section className="overflow-hidden rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:p-8">
                <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-2xl">
                        <Badge variant="secondary" className="mb-4 rounded-md border-primary/15 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                            Services
                        </Badge>
                        <h2 className="font-headline text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                            Choose a digital service
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                            Pay essential accounts, receive clear confirmations, and keep every request trackable from your Valley Farm account.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span>Pick a service and continue with checkout</span>
                    </div>
                </div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                    {services.map((service) => {
                        const isActive = service.status === "active";

                        const CardContent = (
                            <div className={cn(
                                "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm transition-all duration-300",
                                isActive ? cn("cursor-pointer hover:-translate-y-1 hover:shadow-md", service.borderClass) : "cursor-not-allowed opacity-60 grayscale-[35%]"
                            )}>
                                <div className={cn(
                                    "relative flex aspect-[5/3] w-full items-center justify-center overflow-hidden border-b p-8 transition-colors duration-300",
                                    service.bgClass
                                )}>
                                    <div className="absolute right-4 top-4 z-20">
                                        {!isActive ? (
                                            <Badge variant="secondary" className="rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm">
                                                Coming Soon
                                            </Badge>
                                        ) : (
                                            <Badge className="rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm hover:bg-background dark:bg-primary dark:text-primary-foreground">
                                                Available
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="relative flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:scale-[1.03]">
                                        <div className="relative h-[68%] w-[68%]">
                                            <Image
                                                src={service.image}
                                                alt={service.title}
                                                fill
                                                className="object-contain drop-shadow-md"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 flex flex-1 flex-col bg-card p-5 sm:p-6">
                                    <div className="absolute -top-6 left-5">
                                        <div className={cn(
                                            "flex h-12 w-12 items-center justify-center rounded-lg border border-background/70 shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5",
                                            service.iconClass
                                        )}>
                                            <service.icon className="h-6 w-6" />
                                        </div>
                                    </div>

                                    <div className="mt-5 flex flex-1 flex-col">
                                        <h3 className="font-headline text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
                                            {service.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {service.description}
                                        </p>
                                    </div>

                                    <div className={cn(
                                        "mt-5 flex items-center text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300",
                                        isActive ? "text-primary group-hover:translate-x-1" : "text-muted-foreground"
                                    )}>
                                        {isActive ? "Pay now" : "Coming soon"}
                                        {isActive ? <ChevronRight className="ml-1 h-4 w-4" /> : null}
                                    </div>
                                </div>
                            </div>
                        );

                        if (isActive) {
                            return (
                                <motion.div key={service.id} variants={itemVariants} className="h-full">
                                    <Link href={service.href} className="group block h-full rounded-xl outline-none focus:ring-2 focus:ring-primary focus:ring-offset-4 dark:focus:ring-offset-background">
                                        {CardContent}
                                    </Link>
                                </motion.div>
                            );
                        }

                        return (
                            <motion.div key={service.id} variants={itemVariants} className="cursor-not-allowed group h-full">
                                {CardContent}
                            </motion.div>
                        );
                    })}
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mx-auto mt-8 w-full max-w-3xl rounded-xl border bg-background p-5 text-center sm:p-6"
                >
                    <div className="relative z-10 mb-4 flex items-center justify-center gap-3 text-foreground">
                        <div className="rounded-lg border border-primary/10 bg-primary/10 p-2 text-primary">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/80 sm:text-sm">Secure Payments</span>
                    </div>
                    <p className="relative z-10 mx-auto max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        Open a service, verify the account details, and keep the final receipt for your records.
                    </p>
                </motion.div>
            </section>
        </div>
    );
}
