"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    className?: string; // Class for the trigger wrapper
    delayDuration?: number;
}

export function Tooltip({
    content,
    children,
    side = "top",
    className,
    delayDuration = 200
}: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);
    const [coords, setCoords] = React.useState({ x: 0, y: 0 });
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const updatePosition = React.useCallback(() => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const scrollX = 0; // Fixed position relative to viewport, no scroll needed
        const scrollY = 0;

        let x = 0;
        let y = 0;
        const gap = 10; // Distance from trigger to tooltip box

        switch (side) {
            case "top":
                x = rect.left + rect.width / 2;
                y = rect.top - gap;
                break;
            case "bottom":
                x = rect.left + rect.width / 2;
                y = rect.bottom + gap;
                break;
            case "left":
                x = rect.left - gap;
                y = rect.top + rect.height / 2;
                break;
            case "right":
                x = rect.right + gap;
                y = rect.top + rect.height / 2;
                break;
        }

        setCoords({ x, y });
    }, [side]);

    const handleMouseEnter = () => {
        // Disable tooltip on mobile (screens < 768px)
        if (typeof window !== 'undefined' && window.innerWidth < 768) return;

        if (timerRef.current) clearTimeout(timerRef.current);

        // Calculate position immediately on enter so it's ready
        updatePosition();

        timerRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delayDuration);
    };

    const handleMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsVisible(false);
    };

    const handleMouseDown = () => {
        setIsVisible(false);
    }

    // Update position on scroll or resize while visible
    React.useEffect(() => {
        if (isVisible) {
            window.addEventListener("scroll", updatePosition, true);
            window.addEventListener("resize", updatePosition);
            return () => {
                window.removeEventListener("scroll", updatePosition, true);
                window.removeEventListener("resize", updatePosition);
            };
        }
    }, [isVisible, updatePosition]);

    // Animation variants
    const getVariants = () => {
        switch (side) {
            case 'top': return {
                initial: { opacity: 0, scale: 0.9, x: "-50%", y: 5 },
                animate: { opacity: 1, scale: 1, x: "-50%", y: "-100%" },
                exit: { opacity: 0, scale: 0.9, x: "-50%", y: 5 }
            };
            case 'bottom': return {
                initial: { opacity: 0, scale: 0.9, x: "-50%", y: -5 },
                animate: { opacity: 1, scale: 1, x: "-50%", y: 0 },
                exit: { opacity: 0, scale: 0.9, x: "-50%", y: -5 }
            };
            case 'left': return {
                initial: { opacity: 0, scale: 0.9, x: 5, y: "-50%" },
                animate: { opacity: 1, scale: 1, x: "-100%", y: "-50%" },
                exit: { opacity: 0, scale: 0.9, x: 5, y: "-50%" }
            };
            case 'right': return {
                initial: { opacity: 0, scale: 0.9, x: -5, y: "-50%" },
                animate: { opacity: 1, scale: 1, x: 0, y: "-50%" },
                exit: { opacity: 0, scale: 0.9, x: -5, y: "-50%" }
            };
        }
    };

    const variant = getVariants();

    if (!mounted) return <div className={className}>{children}</div>;

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
                            initial={variant?.initial}
                            animate={variant?.animate}
                            exit={variant?.exit}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className={cn(
                                "fixed z-[9999] px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-md shadow-lg pointer-events-none whitespace-nowrap"
                            )}
                            style={{
                                left: coords.x,
                                top: coords.y,
                            }}
                        >
                            {content}
                            <Arrow side={side} />
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

function Arrow({ side }: { side: string }) {
    // Arrow logic:
    // The arrow is a small square rotated 45 degrees.
    // It should be positioned on the edge of the tooltip closer to the trigger.

    // NOTE: The tooltip container is ALREADY transformed (e.g. translateY(-100%)).
    // So "bottom" of the relative container is actually the visual bottom.

    const baseClass = "absolute w-2 h-2 bg-primary rotate-45";

    let positionClass = "";
    switch (side) {
        case 'top':
            // Tooltip is moved up by 100%. So the arrow needs to be at the bottom of the content box.
            positionClass = "bottom-[-4px] left-1/2 -translate-x-1/2";
            break;
        case 'bottom':
            // Tooltip is just moved -50% X. Top is at 0. Arrow at top.
            positionClass = "top-[-4px] left-1/2 -translate-x-1/2";
            break;
        case 'left':
            // Tooltip moved -100% X, -50% Y. Arrow at right.
            positionClass = "right-[-4px] top-1/2 -translate-y-1/2";
            break;
        case 'right':
            // Tooltip moved -50% Y. Arrow at left.
            positionClass = "left-[-4px] top-1/2 -translate-y-1/2";
            break;
    }

    return (
        <div className={cn(baseClass, positionClass)} />
    );
}
