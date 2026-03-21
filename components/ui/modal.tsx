"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    headerAction?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, className, headerAction }: ModalProps) {

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Content */}
            <div className={cn(
                "relative w-full max-w-lg rounded-xl border bg-card text-card-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]",
                className
            )}>
                <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
                    <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                    <div className="flex items-center gap-2">
                        {headerAction}
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 hover:bg-muted transition-colors"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
