"use client";

import { Badge } from "@/components/ui/badge";
import { Zap, Tv, Building, ShieldPlus, Wifi, CreditCard, ChevronRight, Sparkles, HeartPulse } from "lucide-react";
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
        id: "councils",
        title: DIGITAL_SERVICES.councils.label,
        description: DIGITAL_SERVICES.councils.description,
        icon: Building,
        image: "/images/city-of-harare.png",
        href: "/digital/councils",
        bgClass: "bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-900/40",
        borderClass: "group-hover:border-amber-500/50 dark:group-hover:border-amber-500/30",
        iconClass: "text-amber-600 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400",
        status: DIGITAL_SERVICES.councils.status,
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
    {
        id: "internet",
        title: DIGITAL_SERVICES.internet.label,
        description: DIGITAL_SERVICES.internet.description,
        icon: Wifi,
        image: "/images/internet_illustration.png",
        href: "/digital/internet",
        bgClass: "bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-950/40 dark:to-blue-900/40",
        borderClass: "group-hover:border-cyan-500/50 dark:group-hover:border-cyan-500/30",
        iconClass: "text-cyan-600 bg-cyan-100 dark:bg-cyan-500/20 dark:text-cyan-400",
        status: DIGITAL_SERVICES.internet.status,
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
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function DigitalDashboard() {
    return (
        <div className="w-full min-h-screen bg-background text-foreground pb-24 font-sans">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/[0.02] to-background pt-20 pb-24 px-6 sm:px-12 lg:px-24 mb-16 rounded-b-[3rem] border-b border-border/40">
                {/* Decorative background elements */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute top-20 -left-20 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                
                <div className="relative max-w-4xl mx-auto z-10 text-center flex flex-col items-center">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-8 backdrop-blur-md shadow-sm"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs sm:text-sm font-semibold tracking-widest uppercase">Premium Services</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/90 to-foreground/60 mb-8 leading-[1.1]"
                    >
                        Digital Hub
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed font-light"
                    >
                        Experience seamless, instant payments for all your essential digital services. Powered by enterprise-grade security.
                    </motion.p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                {/* Services Grid */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10"
                >
                    {services.map((service) => {
                        const isActive = service.status === "active";

                        const CardContent = (
                            <div className={cn(
                                "relative group flex flex-col h-full bg-card backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-border/50 shadow-sm transition-all duration-500",
                                isActive ? cn("hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 cursor-pointer", service.borderClass) : "opacity-70 grayscale-[50%]"
                            )}>
                                {/* Image Header Area */}
                                <div className={cn(
                                    "relative w-full aspect-[4/3] overflow-hidden flex items-center justify-center p-8 transition-colors duration-500",
                                    service.bgClass
                                )}>
                                    {/* Status Badge Overlay */}
                                    <div className="absolute top-6 right-6 z-20">
                                        {!isActive ? (
                                            <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-foreground shadow-sm uppercase text-[10px] tracking-widest font-bold border-none px-3 py-1.5">
                                                Coming Soon
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-white/90 hover:bg-white text-primary backdrop-blur-md uppercase text-[10px] tracking-widest font-bold shadow-lg border-none px-3 py-1.5 dark:bg-primary dark:text-primary-foreground">
                                                Available
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="relative w-full h-full transform transition-transform duration-700 ease-in-out group-hover:scale-105 flex items-center justify-center">
                                        <div className="relative w-[70%] h-[70%]">
                                            <Image
                                                src={service.image}
                                                alt={service.title}
                                                fill
                                                className="object-contain drop-shadow-2xl transition-transform duration-500 group-hover:-translate-y-2"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Content Body Area */}
                                <div className="p-8 sm:p-10 flex flex-col flex-1 relative z-10 bg-card">
                                    <div className="absolute -top-10 left-8">
                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl backdrop-blur-xl border border-white/20 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                                            service.iconClass
                                        )}>
                                            <service.icon className="w-8 h-8" />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-col flex-1">
                                        <h3 className="font-headline font-bold text-2xl text-foreground group-hover:text-primary transition-colors duration-300">
                                            {service.title}
                                        </h3>
                                        <p className="text-base text-muted-foreground mt-3 leading-relaxed font-light">
                                            {service.description}
                                        </p>
                                    </div>

                                    {/* Action indicator for active cards */}
                                    <div className={cn(
                                        "mt-8 flex items-center text-sm font-bold uppercase tracking-wide transition-all duration-300",
                                        isActive ? "text-primary group-hover:translate-x-2" : "text-transparent"
                                    )}>
                                        Proceed to Payment <ChevronRight className="ml-1 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        );

                        if (isActive) {
                            return (
                                <motion.div key={service.id} variants={itemVariants} className="h-full">
                                    <Link href={service.href} className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-4 rounded-[2.5rem] group h-full outline-none dark:focus:ring-offset-background">
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

                {/* Powered by Smile Pay */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="mt-24 w-full max-w-3xl mx-auto text-center p-8 sm:p-10 bg-card rounded-[2.5rem] shadow-sm border border-border/50 relative overflow-hidden group hover:shadow-md transition-shadow duration-500"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                    <div className="flex items-center justify-center gap-3 text-foreground mb-5 relative z-10">
                        <div className="p-2.5 bg-primary/10 rounded-full text-primary shadow-sm border border-primary/10">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-sm sm:text-base tracking-widest uppercase text-foreground/90">Secure Payments Guarantee</span>
                    </div>
                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto relative z-10 font-light">
                        All Valleyfarm Digital transactions are securely processed directly through <span className="font-semibold text-foreground">Smile Pay</span>. We maintain strict compliance and <span className="underline decoration-primary/40 underline-offset-4 font-medium text-foreground/80">never store your banking information</span>.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
