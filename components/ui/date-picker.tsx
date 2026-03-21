"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DatePickerProps {
    value?: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    minDate?: string; // YYYY-MM-DD
    maxDate?: string; // YYYY-MM-DD
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    className,
    disabled = false,
    minDate,
    maxDate
}: DatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [view, setView] = React.useState<"days" | "months" | "years">("days");
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Initial view state based on value or today
    const [viewDate, setViewDate] = React.useState(() => {
        if (value) return new Date(value);
        return new Date();
    });

    // Reset view when closing
    React.useEffect(() => {
        if (!isOpen) {
            setView("days");
        } else {
            // Auto-scroll to center when opening
            setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [isOpen]);

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const firstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 = Sun
    };

    // Navigation Handlers
    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission
        if (view === "days") setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        if (view === "months") setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
        if (view === "years") setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1));
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission
        if (view === "days") setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        if (view === "months") setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
        if (view === "years") setViewDate(new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1));
    };

    const handleSelectDate = (day: number) => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        onChange(`${year}-${month}-${d}`);
        setIsOpen(false);
    };

    const handleSelectMonth = (monthIndex: number) => {
        setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
        setView("days");
    };

    const handleSelectYear = (year: number) => {
        setViewDate(new Date(year, viewDate.getMonth(), 1));
        setView("months");
    };

    // Click Outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Data Generation
    const totalDays = daysInMonth(viewDate);
    const startDay = firstDayOfMonth(viewDate);

    const daysArray = Array.from({ length: 42 }, (_, i) => {
        const dayNumber = i - startDay + 1;
        return (dayNumber > 0 && dayNumber <= totalDays) ? dayNumber : null;
    });

    // Formatting display
    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const [y, m, d] = dateStr.split('-');
        if (!y || !m || !d) return dateStr;
        return `${d}/${m}/${y}`;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Years for Year View (12 year grid centered(ish))
    const currentYear = viewDate.getFullYear();
    const startYear = currentYear - 6;
    const yearsArray = Array.from({ length: 12 }, (_, i) => startYear + i);

    return (
        <div className={cn("relative w-full group", className)} ref={containerRef}>
            {/* Trigger - Match SearchableSelect (rounded-md) */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "flex items-center w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all text-left",
                    !value && "text-muted-foreground"
                )}
            >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                {value ? <span className="truncate">{formatDateDisplay(value)}</span> : <span>{placeholder}</span>}
            </button>

            {/* Dropdown - match SearchableSelect (rounded-md container) */}
            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-[280px] rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 p-3">

                    {/* Navigation Header */}
                    <div className="flex items-center justify-between mb-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={handlePrev} type="button">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setView("months")}
                                className={cn("text-sm font-semibold hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors", view === 'months' && "bg-accent")}
                            >
                                {monthNames[viewDate.getMonth()]}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("years")}
                                className={cn("text-sm font-semibold hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-md transition-colors", view === 'years' && "bg-accent")}
                            >
                                {viewDate.getFullYear()}
                            </button>
                        </div>

                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={handleNext} type="button">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* View: Days */}
                    {view === "days" && (
                        <div className="animate-in slide-in-from-left-2 duration-200">
                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, idx) => (
                                    <div key={d} className={cn("text-[0.75rem] font-medium text-muted-foreground", (idx === 0 || idx === 6) && "text-red-500/80")}>
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {daysArray.map((day, i) => {
                                    if (!day) return <div key={i} />;

                                    const currentObj = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                    const currentDateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const isSelected = value === currentDateStr;
                                    const isToday = new Date().toDateString() === currentObj.toDateString();
                                    const isWeekend = currentObj.getDay() === 0 || currentObj.getDay() === 6;

                                    // Disable logic
                                    const isBeforeMin = minDate ? currentDateStr < minDate : false;
                                    const isAfterMax = maxDate ? currentDateStr > maxDate : false;
                                    const isDisabled = disabled || isBeforeMin || isAfterMax;

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => !isDisabled && handleSelectDate(day)}
                                            className={cn(
                                                "h-8 w-8 rounded-md text-xs flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 relative",
                                                isDisabled && "text-muted-foreground opacity-30 cursor-not-allowed",
                                                !isDisabled && !isSelected && "hover:bg-accent hover:text-accent-foreground",
                                                !isDisabled && !isSelected && isWeekend && "text-red-600 font-medium",
                                                isSelected && "bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-sm",
                                                !isSelected && isToday && "bg-accent/50 text-accent-foreground font-semibold border border-primary/40",
                                                !isSelected && isToday && isWeekend && "text-red-600"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* View: Months */}
                    {view === "months" && (
                        <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-left-2 duration-200 py-2">
                            {shortMonthNames.map((m, idx) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => handleSelectMonth(idx)}
                                    className={cn(
                                        "h-9 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all focus:outline-none focus:ring-2 ring-primary/20",
                                        idx === viewDate.getMonth() && "bg-primary/10 text-primary border border-primary/20"
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* View: Years */}
                    {view === "years" && (
                        <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-left-2 duration-200 py-2">
                            {yearsArray.map((y) => (
                                <button
                                    key={y}
                                    type="button"
                                    onClick={() => handleSelectYear(y)}
                                    className={cn(
                                        "h-9 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all focus:outline-none focus:ring-2 ring-primary/20",
                                        y === viewDate.getFullYear() && "bg-primary/10 text-primary border border-primary/20",
                                        y === new Date().getFullYear() && "text-blue-600 font-bold"
                                    )}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Footer: Today Button (Blue) */}
                    <div className="mt-3 pt-2 border-t flex justify-center">
                        <button
                            type="button"
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-md uppercase tracking-wider transition-colors"
                            onClick={() => {
                                const today = new Date();
                                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

                                // Respect min/max on Today click
                                if (minDate && todayStr < minDate) return;
                                if (maxDate && todayStr > maxDate) return;

                                setViewDate(today);
                                onChange(todayStr);
                                setIsOpen(false);
                            }}
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
