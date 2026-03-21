"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import styles from "./delivery-button.module.css";

interface DeliveryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading: boolean;
    isSuccess?: boolean;
    children?: React.ReactNode;
}

export const DeliveryButton = ({ isLoading, isSuccess, children = "Complete Order", className, ...props }: DeliveryButtonProps) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isLoading) {
            setIsAnimating(true);
            setShowSuccess(false);
            // Reset playback rate if previously sped up
            if (buttonRef.current) {
               const anims = buttonRef.current.getAnimations({ subtree: true });
               anims.forEach(anim => anim.updatePlaybackRate(1));
            }
        } else if (isSuccess) {
            // Speed up animation to finish gracefully
            if (isAnimating && buttonRef.current) {
                const anims = buttonRef.current.getAnimations({ subtree: true });
                anims.forEach(anim => {
                    // Speed up significantly to finish the 10s animation quickly
                    anim.updatePlaybackRate(8); 
                });
                
                // We rely on the animation 'onfinish' or a timeout to switch to success state?
                // Visual check: truck leaves.
                // We can just switch to success text after a short delay (e.g. 1s max with 8x speed)
                setShowSuccess(true);
            } else {
                setShowSuccess(true);
            }
        } else if (!isLoading && !isSuccess) {
             if (isAnimating) {
                setIsAnimating(false);
                setShowSuccess(false);
             }
        }
    }, [isLoading, isSuccess, isAnimating]);
    
    // Auto-reset logic if animation finishes naturally? 
    // The user said "one time animation".
    // 10s is long. 
    // We don't need a specific timeout reset because 'forwards' keeps it at end state.
    // If success comes later, we show success text.

    // Handle initial click
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isLoading && !isSuccess && !isAnimating) {
            setIsAnimating(true);
            props.onClick?.(e);
        }
    };

    return (
        <button
            ref={buttonRef}
            className={cn(
                styles.order,
                // Default styles matching "Add Group" button
                "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-500/20 text-white font-semibold transition-all hover:scale-105 active:scale-95",
                // Animation state override
                isAnimating && styles.animate,
                isAnimating && "hover:scale-100 active:scale-100 cursor-default",
                className
            )}
            onClick={handleClick}
            disabled={isLoading || isSuccess || props.disabled}
            {...props}
        >
            <span className={cn(styles.default, (isAnimating || showSuccess) && "opacity-0 transition-opacity")}>
                {children}
            </span>
            
            <span className={cn(styles.success, showSuccess ? "opacity-100" : "opacity-0")}>
                Done
                <svg viewBox="0 0 12 10">
                    <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
                </svg>
            </span>
            
            <div className={cn(styles.animationContainer)}>
                <div className={styles.box}></div>
                <div className={styles.truck}>
                    <div className={styles.back}></div>
                    <div className={styles.front}>
                        <div className={styles.window}></div>
                    </div>
                    <div className={cn(styles.light, styles.top)}></div>
                    <div className={cn(styles.light, styles.bottom)}></div>
                </div>
                <div className={styles.lines}></div>
            </div>
        </button>
    );
};
