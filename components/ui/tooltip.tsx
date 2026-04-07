"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    className?: string;
    delayDuration?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GAP = 10; // px between trigger edge and tooltip

// ─── Spring config — snappy but not harsh ────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.6 };

// ─── Per-side animation variants ─────────────────────────────────────────────

function getVariants(side: TooltipProps["side"]) {
    const OFFSET = 6;
    switch (side) {
        case "top": return {
            initial: { opacity: 0, scale: 0.88, x: "-50%", y: OFFSET },
            animate: { opacity: 1, scale: 1, x: "-50%", y: "-100%" },
            exit: { opacity: 0, scale: 0.88, x: "-50%", y: OFFSET },
        };
        case "bottom": return {
            initial: { opacity: 0, scale: 0.88, x: "-50%", y: -OFFSET },
            animate: { opacity: 1, scale: 1, x: "-50%", y: 0 },
            exit: { opacity: 0, scale: 0.88, x: "-50%", y: -OFFSET },
        };
        case "left": return {
            initial: { opacity: 0, scale: 0.88, x: OFFSET, y: "-50%" },
            animate: { opacity: 1, scale: 1, x: "-100%", y: "-50%" },
            exit: { opacity: 0, scale: 0.88, x: OFFSET, y: "-50%" },
        };
        case "right": return {
            initial: { opacity: 0, scale: 0.88, x: -OFFSET, y: "-50%" },
            animate: { opacity: 1, scale: 1, x: 0, y: "-50%" },
            exit: { opacity: 0, scale: 0.88, x: -OFFSET, y: "-50%" },
        };
    }
}

// ─── Arrow ────────────────────────────────────────────────────────────────────

function TooltipArrow({ side }: { side: TooltipProps["side"] }) {
    /**
     * We render a tiny SVG triangle — cleaner than a rotated square because it
     * never bleeds outside the tooltip box or creates odd clipping artefacts at
     * sub-pixel sizes.
     */
    const size = 7; // half-base of the triangle

    const paths: Record<NonNullable<TooltipProps["side"]>, React.CSSProperties & { path: string }> = {
        top: { path: `M0,0 L${size},0 L${size / 2},${size * 0.75}Z`, bottom: -size * 0.75 + 0.5, left: "50%", transform: "translateX(-50%)", top: "auto" },
        bottom: { path: `M0,${size * 0.75} L${size},${size * 0.75} L${size / 2},0Z`, top: -size * 0.75 + 0.5, left: "50%", transform: "translateX(-50%)", bottom: "auto" },
        left: { path: `M0,0 L${size * 0.75},${size / 2} L0,${size}Z`, right: -size * 0.75 + 0.5, top: "50%", transform: "translateY(-50%)", left: "auto" },
        right: { path: `M${size * 0.75},0 L0,${size / 2} L${size * 0.75},${size}Z`, left: -size * 0.75 + 0.5, top: "50%", transform: "translateY(-50%)", right: "auto" },
    };

    const config = paths[side ?? "top"];
    const { path, ...style } = config;

    const svgSize = side === "top" || side === "bottom"
        ? { width: size, height: size * 0.75 }
        : { width: size * 0.75, height: size };

    return (
        <svg
            {...svgSize}
            viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
            style={{ position: "absolute", ...style } as React.CSSProperties}
            className="fill-[#18181b] dark:fill-[#fafafa] pointer-events-none"
            aria-hidden
        >
            <path d={path} />
        </svg>
    );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export function Tooltip({
    content,
    children,
    side = "top",
    className,
    delayDuration = 180,
}: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const [coords, setCoords] = React.useState({ x: 0, y: 0 });
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => { setMounted(true); }, []);

    const updatePosition = React.useCallback(() => {
        if (!triggerRef.current) return;
        const r = triggerRef.current.getBoundingClientRect();
        let x = 0, y = 0;

        switch (side) {
            case "top": x = r.left + r.width / 2; y = r.top - GAP; break;
            case "bottom": x = r.left + r.width / 2; y = r.bottom + GAP; break;
            case "left": x = r.left - GAP; y = r.top + r.height / 2; break;
            case "right": x = r.right + GAP; y = r.top + r.height / 2; break;
        }
        setCoords({ x, y });
    }, [side]);

    const handleMouseEnter = React.useCallback(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        updatePosition();
        timerRef.current = setTimeout(() => setIsVisible(true), delayDuration);
    }, [delayDuration, updatePosition]);

    const handleMouseLeave = React.useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsVisible(false);
    }, []);

    const handleMouseDown = React.useCallback(() => setIsVisible(false), []);

    // Re-position on scroll / resize while open
    React.useEffect(() => {
        if (!isVisible) return;
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [isVisible, updatePosition]);

    if (!mounted) return <div className={className}>{children}</div>;

    const variants = getVariants(side);

    return (
        <>
            <div
                ref={triggerRef}
                className={cn("wrapper-tooltip flex items-center justify-center w-fit cursor-pointer", className)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseDown={handleMouseDown}
            >
                {children}
            </div>

            {createPortal(
                <AnimatePresence>
                    {isVisible && (
                        <motion.div
                            role="tooltip"
                            initial={variants?.initial}
                            animate={variants?.animate}
                            exit={variants?.exit}
                            transition={SPRING}
                            style={{ left: coords.x, top: coords.y }}
                            className={cn(
                                // Layout
                                "fixed z-[9999] pointer-events-none",
                                // Box
                                "px-2.5 py-1.5 rounded-lg",
                                // Typography — tiny, sharp, legible
                                "text-[11.5px] font-semibold leading-snug tracking-wide whitespace-nowrap",
                                // Light mode: near-black surface
                                "bg-zinc-900 text-zinc-50",
                                // Dark mode: near-white surface, dark text — inverted
                                "dark:bg-zinc-50 dark:text-zinc-900",
                                // Shadow — layered for depth
                                "shadow-[0_2px_6px_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.12)]",
                                "dark:shadow-[0_2px_8px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.25)]",
                            )}
                        >
                            {content}
                            <TooltipArrow side={side} />
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}