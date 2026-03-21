"use client";

import { cn } from "@/lib/utils";

interface SidebarTriggerProps {
    isOpen: boolean;
    className?: string;
}

export function SidebarTrigger({ isOpen, className }: SidebarTriggerProps) {
    return (
        <div className={cn("flex flex-col justify-center items-center w-6 h-6 gap-[5px]", className)}>
            <span
                className={cn(
                    "bg-foreground/80 h-[2px] w-5 rounded-full transition-all duration-300 ease-in-out origin-center",
                    isOpen && "translate-y-[7px] rotate-45 w-5"
                )}
            />
            <span
                className={cn(
                    "bg-foreground/80 h-[2px] w-5 rounded-full transition-all duration-300 ease-in-out",
                    isOpen && "opacity-0 scale-0"
                )}
            />
            <span
                className={cn(
                    "bg-foreground/80 h-[2px] w-5 rounded-full transition-all duration-300 ease-in-out origin-center",
                    isOpen && "-translate-y-[7px] -rotate-45 w-5"
                )}
            />
        </div>
    );
}
