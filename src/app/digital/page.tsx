"use client";

import { Badge } from "@/components/ui/badge";
import { Zap, Phone, Tv, Building, ShieldPlus, Wifi, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DIGITAL_SERVICES } from "@/lib/digital-services";

import Image from "next/image";

const services = [
    {
        id: "zesa",
        title: DIGITAL_SERVICES.zesa.label,
        description: DIGITAL_SERVICES.zesa.description,
        icon: Zap,
        image: "/images/Zesa.webp",
        href: "/digital/zesa",
        bgClass: "bg-gradient-to-br from-red-50 to-red-100",
        iconClass: "text-red-600 bg-red-200/50",
        status: DIGITAL_SERVICES.zesa.status,
    },
    {
        id: "airtime",
        title: DIGITAL_SERVICES.airtime.label,
        description: DIGITAL_SERVICES.airtime.description,
        icon: Phone,
        image: "/images/airtime_illustration.png",
        href: "/digital/airtime",
        bgClass: "bg-gradient-to-br from-green-50 to-green-100",
        iconClass: "text-green-600 bg-green-200/50",
        status: DIGITAL_SERVICES.airtime.status,
    },
    {
        id: "dstv",
        title: DIGITAL_SERVICES.dstv.label,
        description: DIGITAL_SERVICES.dstv.description,
        icon: Tv,
        image: "/images/dstv_illustration.png",
        href: "/digital/dstv",
        bgClass: "bg-gradient-to-br from-blue-50 to-blue-100",
        iconClass: "text-blue-600 bg-blue-200/50",
        status: DIGITAL_SERVICES.dstv.status,
    },
    {
        id: "councils",
        title: DIGITAL_SERVICES.councils.label,
        description: DIGITAL_SERVICES.councils.description,
        icon: Building,
        image: "/images/councils_illustration.png",
        href: "/digital/councils",
        bgClass: "bg-gradient-to-br from-amber-50 to-amber-100",
        iconClass: "text-amber-600 bg-amber-200/50",
        status: DIGITAL_SERVICES.councils.status,
    },
    {
        id: "nyaradzo",
        title: DIGITAL_SERVICES.nyaradzo.label,
        description: DIGITAL_SERVICES.nyaradzo.description,
        icon: ShieldPlus,
        image: "/images/insurance_illustration.png",
        href: "/digital/nyaradzo",
        bgClass: "bg-gradient-to-br from-purple-50 to-purple-100",
        iconClass: "text-purple-600 bg-purple-200/50",
        status: DIGITAL_SERVICES.nyaradzo.status,
    },
    {
        id: "internet",
        title: DIGITAL_SERVICES.internet.label,
        description: DIGITAL_SERVICES.internet.description,
        icon: Wifi,
        image: "/images/internet_illustration.png",
        href: "/digital/internet",
        bgClass: "bg-gradient-to-br from-cyan-50 to-cyan-100",
        iconClass: "text-cyan-600 bg-cyan-200/50",
        status: DIGITAL_SERVICES.internet.status,
    },
];

export default function DigitalDashboard() {
    return (
        <div className="w-full">
            {/* Services Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service) => {
                    const isActive = service.status === "active";

                    const CardContent = (
                        <div className={cn(
                            "relative group flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-sm border border-border/40 transition-all duration-500",
                            isActive ? "hover:shadow-xl hover:-translate-y-2 cursor-pointer" : "opacity-80 grayscale-[30%]"
                        )}>
                            {/* Image Header Area */}
                            <div className={cn(
                                "relative w-full aspect-[4/3] overflow-hidden flex items-center justify-center p-6",
                                service.bgClass
                            )}>
                                {/* Status Badge Overlay */}
                                <div className="absolute top-4 right-4 z-20">
                                    {!isActive ? (
                                        <Badge variant="secondary" className="bg-white/80 backdrop-blur-md text-foreground shadow-sm uppercase text-[10px] tracking-widest font-bold border-none">
                                            Coming Soon
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-primary hover:bg-primary/90 text-white uppercase text-[10px] tracking-widest font-bold shadow-md border-none">
                                            Available
                                        </Badge>
                                    )}
                                </div>

                                <div className="relative w-full h-full transform transition-transform duration-700 group-hover:scale-110">
                                    <Image
                                        src={service.image}
                                        alt={service.title}
                                        fill
                                        className="object-contain drop-shadow-xl"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                </div>
                            </div>

                            {/* Content Body Area */}
                            <div className="p-6 flex flex-col flex-1 relative bg-white">
                                <div className="absolute -top-8 left-6">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-md backdrop-blur-md",
                                        service.iconClass,
                                        "bg-white border text-primary" // override default opacity style
                                    )}>
                                        <service.icon className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col flex-1">
                                    <h3 className="font-headline font-bold text-2xl text-foreground">
                                        {service.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                        {service.description}
                                    </p>
                                </div>

                                {/* Simulated action button style for active cards */}
                                <div className={cn(
                                    "mt-6 flex items-center text-sm font-bold transition-all duration-300",
                                    isActive ? "text-primary group-hover:translate-x-2" : "text-transparent"
                                )}>
                                    Proceed to Payment <span className="ml-2 text-lg leading-none">→</span>
                                </div>
                            </div>
                        </div>
                    );

                    if (isActive) {
                        return (
                            <Link key={service.id} href={service.href} className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-4 rounded-3xl group">
                                {CardContent}
                            </Link>
                        );
                    }

                    return (
                        <div key={service.id} className="cursor-not-allowed group">
                            {CardContent}
                        </div>
                    );
                })}
            </div>

            {/* Powered by ZB Box */}
            <div className="mt-12 w-full max-w-2xl mx-auto text-center p-6 bg-white rounded-2xl shadow-sm border border-border/50">
                <div className="flex items-center justify-center gap-3 text-muted-foreground mb-2">
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium text-sm tracking-wide uppercase">Secure Payments Guarantee</span>
                </div>
                <p className="text-sm">
                    All Valleyfarm Digital transactions are securely processed directly through the <b>ZB Bank Merchant Gateway</b>. We do not store your banking information.
                </p>
            </div>

        </div>
    );
}
