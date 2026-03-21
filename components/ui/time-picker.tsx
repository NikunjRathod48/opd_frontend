"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TimePickerProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    containerClassName?: string;
    id?: string;
    minTime?: string; // HH:MM (24h)
    disabled?: boolean;
}

export function TimePicker({
    label,
    value,
    onChange,
    id,
    containerClassName,
    minTime,
    disabled = false
}: TimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const generatedId = React.useId();
    const inputId = id || generatedId;

    // Helper: 24h -> 12h components
    const parseTime = (val: string) => {
        const [h, m] = val.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 || 12;
        return { hour12, minute: m, period };
    };

    // Helper: 12h components -> 24h string
    const formatTime = (h12: number, m: number, p: string) => {
        let h24 = h12;
        if (p === "PM" && h12 !== 12) h24 += 12;
        if (p === "AM" && h12 === 12) h24 = 0;
        return `${h24.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };

    const { hour12, minute, period } = parseTime(value || "00:00");

    // Hours (1-12)
    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    // Minutes (0-59)
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const periods = ["AM", "PM"];

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            // Auto-scroll
            setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleTimeChange = (type: "hour" | "minute" | "period", val: number | string) => {
        let newHour12 = hour12;
        let newMinute = minute;
        let newPeriod = period;

        if (type === "hour") newHour12 = val as number;
        if (type === "minute") newMinute = val as number;
        if (type === "period") newPeriod = val as string;

        onChange(formatTime(newHour12, newMinute, newPeriod));
    };

    // Formatted display value
    const displayValue = value ? `${hour12.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${period}` : "";

    return (
        <div className={cn("space-y-3", containerClassName)} ref={containerRef}>
            {label && (
                <Label
                    htmlFor={inputId}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    {label}
                </Label>
            )}
            <div className="relative">
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    id={inputId}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal pl-9 hover:bg-background",
                        !value && "text-muted-foreground",
                        disabled && "opacity-50 cursor-not-allowed bg-muted"
                    )}
                >
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    {displayValue || "Select time"}
                </Button>

                {isOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full min-w-[240px] rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2">
                        <div className="flex bg-muted/20 p-2 border-b">
                            <div className="flex-1 text-center text-xs font-semibold text-muted-foreground">Hr</div>
                            <div className="flex-1 text-center text-xs font-semibold text-muted-foreground">Min</div>
                            <div className="flex-1 text-center text-xs font-semibold text-muted-foreground">Am/Pm</div>
                        </div>
                        <div className="flex h-48 divide-x">
                            <ScrollArea className="flex-1 h-full">
                                <div className="p-2 space-y-1">
                                    {hours.map((h) => {
                                        // Simple disable logic: 
                                        // If we have a minTime, parse it.
                                        let isDisabled = false;
                                        if (minTime) {
                                            const [minH, minM] = minTime.split(':').map(Number);
                                            // Convert current button hour 'h' (1-12) + period to 24h for comparison
                                            // Since this loop is just 1-12, we can't fully know if it's AM or PM context yet unless we rely on 'period' state.
                                            // Let's assume the user selects period FIRST or we check against currently selected period.
                                            let h24 = h;
                                            if (period === "PM" && h !== 12) h24 += 12;
                                            if (period === "AM" && h === 12) h24 = 0;

                                            // Disable if hour is strictly less than minHour
                                            if (h24 < minH) isDisabled = true;
                                        }

                                        return (
                                            <button
                                                type="button"
                                                key={h}
                                                disabled={isDisabled}
                                                className={cn(
                                                    "w-full rounded-sm px-2 py-1.5 text-sm text-center transition-colors outline-none",
                                                    isDisabled ? "opacity-30 cursor-not-allowed text-muted-foreground" : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                                    !isDisabled && hour12 === h && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                                                )}
                                                onClick={() => !isDisabled && handleTimeChange("hour", h)}
                                            >
                                                {h.toString().padStart(2, "0")}
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                            <ScrollArea className="flex-1 h-full">
                                <div className="p-2 space-y-1">
                                    {minutes.map((m) => {
                                        let isDisabled = false;
                                        if (minTime) {
                                            const [minH, minM] = minTime.split(':').map(Number);
                                            // Convert current hour to 24
                                            let currentH24 = hour12;
                                            if (period === "PM" && hour12 !== 12) currentH24 += 12;
                                            if (period === "AM" && hour12 === 12) currentH24 = 0;

                                            // If we are in the same hour as minTime, disable previous minutes
                                            if (currentH24 === minH && m < minM) isDisabled = true;
                                            // If current hour is before minHour, everything is disabled (but hours list handles that).
                                            if (currentH24 < minH) isDisabled = true;
                                        }

                                        return (
                                            <button
                                                type="button"
                                                key={m}
                                                disabled={isDisabled}
                                                className={cn(
                                                    "w-full rounded-sm px-2 py-1.5 text-sm text-center transition-colors outline-none",
                                                    isDisabled ? "opacity-30 cursor-not-allowed text-muted-foreground" : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                                    !isDisabled && minute === m && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                                                )}
                                                onClick={() => !isDisabled && handleTimeChange("minute", m)}
                                            >
                                                {m.toString().padStart(2, "0")}
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                            <ScrollArea className="flex-1 h-full">
                                <div className="p-2 space-y-1">
                                    {periods.map((p) => {
                                        let isDisabled = false;
                                        if (minTime) {
                                            const [minH, _] = minTime.split(':').map(Number);
                                            // AM is 0-11, PM is 12-23.
                                            // If minTime is PM (>=12), disable AM.
                                            if (minH >= 12 && p === "AM") isDisabled = true;
                                        }
                                        return (
                                            <button
                                                type="button"
                                                key={p}
                                                disabled={isDisabled}
                                                className={cn(
                                                    "w-full rounded-sm px-2 py-1.5 text-sm text-center transition-colors outline-none",
                                                    isDisabled ? "opacity-30 cursor-not-allowed text-muted-foreground" : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                                    !isDisabled && period === p && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                                                )}
                                                onClick={() => !isDisabled && handleTimeChange("period", p)}
                                            >
                                                {p}
                                            </button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
