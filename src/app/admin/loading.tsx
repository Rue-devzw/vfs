"use client";

import { motion } from "framer-motion";
import { Store, ShieldCheck, Zap } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex h-[calc(100vh-10rem)] w-full flex-col items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.03)_0%,transparent_70%)]" />
      
      <div className="relative flex items-center justify-center">
        {/* Pulsing blurred background */}
        <motion.div
           className="absolute -inset-10 -z-10 rounded-full bg-primary/20 blur-2xl"
           animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.6, 0.2] }}
           transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Revolving border ring */}
        <motion.div 
           className="absolute -inset-4 -z-10 rounded-3xl border border-primary/20 bg-gradient-to-tr from-primary/10 to-transparent backdrop-blur-sm"
           animate={{ rotate: 360 }}
           transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />

        {/* Central Icon container */}
        <motion.div
           className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/60 text-primary-foreground shadow-2xl shadow-primary/30 ring-1 ring-white/20"
           animate={{ y: [-4, 4, -4], rotate: [0, 2, -2, 0] }}
           transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Store className="h-12 w-12 drop-shadow-md" />
        </motion.div>
      </div>
      
      <div className="mt-12 space-y-3 text-center z-10">
        <motion.h2 
          className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Synchronizing Workspace
        </motion.h2>
        <p className="text-muted-foreground/80 font-medium tracking-wide flex items-center justify-center gap-2">
          <motion.span 
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
          Aggegating live operations...
        </p>
      </div>

      {/* Decorative items showing systems connecting */}
      <div className="mt-16 grid grid-cols-3 gap-16 text-muted-foreground/60 z-10">
         {[
           { icon: ShieldCheck, label: "Security & Control" },
           { icon: Store, label: "Inventory Sync" },
           { icon: Zap, label: "Digital Ops" }
         ].map((item, i) => (
           <motion.div 
             key={item.label}
             animate={{ y: [0, -6, 0], opacity: [0.3, 0.9, 0.3] }} 
             transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
             className="flex flex-col items-center gap-3"
           >
             <div className="p-3 rounded-xl bg-muted/40 shadow-inner border border-white/5">
                <item.icon className="h-6 w-6 text-foreground/70" />
             </div>
             <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">{item.label}</span>
           </motion.div>
         ))}
      </div>
    </div>
  );
}
