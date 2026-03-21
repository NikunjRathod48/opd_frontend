"use client";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionTooltipButtonProps {
    icon: LucideIcon;
    label: string;
    onClick: (e: React.MouseEvent) => void;
    side?: "top" | "bottom" | "left" | "right";
    variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
    className?: string; // Allow custom styling
}

export function ActionTooltipButton({ icon: Icon, label, onClick, side = "top", variant = "ghost", className }: ActionTooltipButtonProps) {
    return (
        <Tooltip content={label} side={side}>
            <Button
                variant={variant}
                size="icon"
                onClick={onClick}
                className={cn("h-8 w-8 rounded-full transition-colors", className)}
            >
                <Icon className="h-4 w-4" />
            </Button>
        </Tooltip>
    );
}
