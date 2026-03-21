"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useLayoutEffect } from "react";
import { cn } from "@/lib/utils";

// Context to manage open state
const DropdownContext = createContext<{
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
} | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
            <div ref={containerRef} className="relative inline-block text-left">
                {children}
            </div>
        </DropdownContext.Provider>
    );
}

export function DropdownMenuTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
    const context = useContext(DropdownContext);
    if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

    const { isOpen, setIsOpen } = context;

    const handleClick = () => setIsOpen(!isOpen);

    // If asChild is true, we should clone the child and add the onClick handler
    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
        return React.cloneElement(child, {
            onClick: (e: React.MouseEvent) => {
                // Call original onClick if exists
                if (child.props.onClick) child.props.onClick(e);
                handleClick();
            }
        });
    }

    return (
        <button onClick={handleClick} className="outline-none">
            {children}
        </button>
    );
}

export function DropdownMenuContent({
    children,
    className,
    align = "center",
    forceMount
}: {
    children: React.ReactNode;
    className?: string;
    align?: "start" | "center" | "end";
    forceMount?: boolean;
}) {
    const context = useContext(DropdownContext);
    if (!context) throw new Error("DropdownMenuContent must be used within DropdownMenu");
    const { isOpen } = context;

    const contentRef = useRef<HTMLDivElement>(null);
    const [isFlipped, setIsFlipped] = useState(false);

    useLayoutEffect(() => {
        if (isOpen && contentRef.current) {
            const rect = contentRef.current.getBoundingClientRect();
            // If the bottom of the content hits the viewport bottom, flip it
            if (rect.bottom > window.innerHeight) {
                setIsFlipped(true);
            } else {
                setIsFlipped(false);
            }
        } else {
            setIsFlipped(false);
        }
    }, [isOpen]);

    if (!isOpen && !forceMount) return null;

    const alignStyles = {
        start: "left-0",
        center: "left-1/2 -translate-x-1/2",
        end: "right-0"
    };

    return (
        <div
            ref={contentRef}
            data-state={isOpen ? "open" : "closed"}
            style={isFlipped ? { bottom: "100%", top: "auto", marginTop: 0, marginBottom: "0.5rem" } : {}}
            className={cn(
                "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                alignStyles[align],
                className
            )}>
            {children}
        </div>
    );
}

export function DropdownMenuItem({
    children,
    className,
    onClick,
    inset
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    inset?: boolean;
}) {
    const context = useContext(DropdownContext);
    const { setIsOpen } = context!;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) onClick();
        setIsOpen(false); // Auto close on item click
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
                inset && "pl-8",
                className
            )}
        >
            {children}
        </div>
    );
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
            {children}
        </div>
    );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
    return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />;
}

export function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
