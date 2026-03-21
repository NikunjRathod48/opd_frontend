"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X, Check, AlertTriangle, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "loading";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 inset-x-3 sm:bottom-6 sm:inset-x-auto sm:right-6 z-[100] flex flex-col gap-3 pointer-events-none sm:items-end">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cn(
                            "pointer-events-auto relative overflow-hidden flex items-center gap-4 px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl shadow-2xl w-full sm:min-w-[320px] sm:max-w-[400px]",
                            "backdrop-blur-xl border border-white/20 dark:border-white/10",
                            "animate-in slide-in-from-right-full fade-in duration-500 ease-out",
                            toast.type === "success" && "bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-100",
                            toast.type === "error" && "bg-rose-50/90 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100",
                            toast.type === "info" && "bg-blue-50/90 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100",
                            toast.type === "loading" && "bg-zinc-50/90 dark:bg-zinc-900/80 text-zinc-900 dark:text-zinc-100"
                        )}
                    >
                        {/* Status Icon with Glow */}
                        <div className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full shadow-inner shrink-0",
                            toast.type === "success" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20",
                            toast.type === "error" && "bg-rose-500/20 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20",
                            toast.type === "info" && "bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20",
                            toast.type === "loading" && "bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 ring-2 ring-zinc-500/20"
                        )}>
                            {toast.type === "success" && <Check className="w-5 h-5" />}
                            {toast.type === "error" && <AlertTriangle className="w-5 h-5" />}
                            {toast.type === "info" && <Info className="w-5 h-5" />}
                            {toast.type === "loading" && <Loader2 className="w-5 h-5 animate-spin" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm leading-tight tracking-wide">
                                {toast.type === "success" ? "Success" : toast.type === "error" ? "Error" : toast.type === "info" ? "Note" : "Loading"}
                            </p>
                            <p className="text-xs opacity-90 truncate mt-1 font-medium">{toast.message}</p>
                        </div>

                        {/* Dismiss Button */}
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -mr-2"
                        >
                            <X className="w-4 h-4 opacity-50" />
                        </button>

                        {/* Progress Bar Animation (CSS based) */}
                        <div className={cn(
                            "absolute bottom-0 left-0 h-[3px] w-full origin-left bg-current opacity-20",
                            "animate-[progress_4s_linear_forwards]"
                        )} style={{ animationDuration: '4000ms' }} />
                    </div>
                ))}
            </div>
            {/* Inject Custom Keyframes for simplicity if not in global css */}
            <style jsx global>{`
                @keyframes progress {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
