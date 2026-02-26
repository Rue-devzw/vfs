import { ReactNode } from "react";
import Image from "next/image";

export default function DigitalServicesLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-[#fdf2f2] pb-16">
            {/* Decorative Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[5%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-[120px]" />
                <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-[#1b7b05]/10 to-transparent blur-[100px]" />
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tl from-blue-500/5 to-transparent blur-[120px]" />
            </div>

            <div className="relative z-10 flex-1">
                {/* Banner Section */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0f0f] via-[#2d1515] to-[#4a2626] text-white/90">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>

                    {/* Floating Orbs in Banner */}
                    <div className="absolute top-0 right-[20%] w-[300px] h-[300px] rounded-full bg-primary/20 blur-[80px]"></div>
                    <div className="absolute bottom-0 left-[10%] w-[200px] h-[200px] rounded-full bg-[#1b7b05]/20 blur-[60px]"></div>

                    <div className="container py-16 md:py-20 mx-auto px-4 md:px-6 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center gap-10">
                            <div className="relative z-10 max-w-2xl flex-1">
                                <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-[#2d1515] bg-white rounded-full uppercase shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                    Valleyfarm Digital
                                </span>
                                <h1 className="text-4xl md:text-5xl lg:text-7xl font-headline font-bold mb-6 leading-[1.1] drop-shadow-lg">
                                    All your bills.
                                    <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-[#1b7b05] drop-shadow-md">
                                        One Place.
                                    </span>
                                </h1>
                                <p className="text-lg md:text-xl text-white/80 max-w-xl font-light leading-relaxed">
                                    Purchase ZESA tokens, buy airtime, and pay your utilities securely with Valleyfarm. Powered by our trusted partnership with <span className="font-semibold text-white">ZB Bank</span>.
                                </p>
                            </div>

                            {/* Graphic Side */}
                            <div className="hidden lg:flex flex-1 justify-end items-center relative">
                                <div className="relative w-[450px] aspect-square rounded-full flex items-center justify-center">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-green-500/20 rounded-full blur-[60px] animate-pulse"></div>
                                    <Image
                                        src="/images/Zesa.webp"
                                        alt="Valleyfarm Digital"
                                        width={350}
                                        height={350}
                                        className="object-contain relative z-10 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform -rotate-[5deg]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="container mx-auto px-4 md:px-6 -mt-8 relative z-20">
                    {children}
                </div>
            </div>
        </div>
    );
}
