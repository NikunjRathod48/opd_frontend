"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function AnimatedBackground() {
    const { theme, systemTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const currentTheme = theme === "system" ? systemTheme : theme;
    const isDark = currentTheme === "dark";

    // Colors: 
    // Light: Soft Blues, Teals, and Whites
    // Dark: Deep Navys, Purples, and Indigos

    // We use a fixed full-screen SVG with large blurring geometric blobs
    // moving slowly to create an "Aurora" effect.

    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            {/* Base Background Layer */}
            <div className={`absolute inset-0 transition-colors duration-1000 ${isDark ? 'bg-background' : 'bg-blue-50/50'}`} />

            {/* Blob 1 */}
            <motion.div
                className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[80px] opacity-40 mix-blend-multiply filter ${isDark ? 'bg-primary/20' : 'bg-blue-200'}`}
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Blob 2 */}
            <motion.div
                className={`absolute top-[-5%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[80px] opacity-40 mix-blend-multiply filter ${isDark ? 'bg-purple-900/30' : 'bg-cyan-200'}`}
                animate={{
                    x: [0, -70, 0],
                    y: [0, 100, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
            />

            {/* Blob 3 (Bottom) */}
            <motion.div
                className={`absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full blur-[100px] opacity-30 mix-blend-normal filter ${isDark ? 'bg-indigo-900/20' : 'bg-sky-200'}`}
                animate={{
                    x: [0, 40, 0],
                    y: [0, -40, 0],
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 5
                }}
            />

            {/* Grid Overlay (Optional texturing) */}
            <div
                className={`absolute inset-0 opacity-[0.03] ${isDark ? 'bg-[url("/grid-dark.svg")]' : 'bg-[url("/grid-light.svg")]'}`}
                style={{ backgroundSize: '40px 40px' }}
            />

            {/* Grain overlay for "Texture" */}
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
            />
        </div>
    );
}
