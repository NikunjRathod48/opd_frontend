"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
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

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseYMD(value?: string): { y: string; m: string; d: string } {
    if (!value) return { y: "", m: "", d: "" };
    const [y = "", m = "", d = ""] = value.split("-");
    return { y, m, d };
}

function buildYMD(y: string, m: string, d: string): string | null {
    const yi = parseInt(y, 10);
    const mi = parseInt(m, 10);
    const di = parseInt(d, 10);
    if (!yi || yi < 1 || yi > 9999) return null;
    if (!mi || mi < 1 || mi > 12) return null;
    const daysInM = new Date(yi, mi, 0).getDate();
    if (!di || di < 1 || di > daysInM) return null;
    return `${yi}-${String(mi).padStart(2, "0")}-${String(di).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

export function DatePicker({
    value,
    onChange,
    placeholder,
    className,
    disabled = false,
    minDate,
    maxDate,
}: DatePickerProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const dayRef = React.useRef<HTMLInputElement>(null);
    const monRef = React.useRef<HTMLInputElement>(null);
    const yrRef = React.useRef<HTMLInputElement>(null);

    const [isOpen, setIsOpen] = React.useState(false);
    const [view, setView] = React.useState<"days" | "months" | "years">("days");

    // Three segment state
    const parsed = parseYMD(value);
    const [dd, setDd] = React.useState(parsed.d);
    const [mm, setMm] = React.useState(parsed.m);
    const [yyyy, setYyyy] = React.useState(parsed.y);

    // Calendar navigation state
    const [navYear, setNavYear] = React.useState(() => {
        if (value) return parseInt(value.split("-")[0], 10);
        return new Date().getFullYear();
    });
    const [navMonth, setNavMonth] = React.useState(() => {
        if (value) return parseInt(value.split("-")[1], 10) - 1;
        return new Date().getMonth();
    });

    // Sync segments when external value changes
    React.useEffect(() => {
        const p = parseYMD(value);
        setDd(p.d);
        setMm(p.m);
        setYyyy(p.y);
        if (p.y && p.m) {
            setNavYear(parseInt(p.y, 10));
            setNavMonth(parseInt(p.m, 10) - 1);
        }
    }, [value]);

    // Click outside to close
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isOpen]);

    // Auto-scroll dropdown into view when it opens
    React.useEffect(() => {
        if (!isOpen || !dropdownRef.current) return;
        // Small delay so the dropdown is painted before measuring
        const id = requestAnimationFrame(() => {
            dropdownRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
        return () => cancelAnimationFrame(id);
    }, [isOpen]);

    // Every time segments change, try to commit the date
    const tryCommit = (d: string, m: string, y: string) => {
        const result = buildYMD(y, m, d);
        if (result) {
            if (minDate && result < minDate) return;
            if (maxDate && result > maxDate) return;
            onChange(result);
            // Update calendar nav to reflect the typed date
            setNavYear(parseInt(y, 10));
            setNavMonth(parseInt(m, 10) - 1);
        }
    };

    // ── Segment handlers ──────────────────────────────────────────────
    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
        setDd(raw);
        if (raw.length === 2 || parseInt(raw, 10) > 3) {
            monRef.current?.focus();
            monRef.current?.select();
        }
        tryCommit(raw, mm, yyyy);
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
        setMm(raw);
        if (raw.length === 2 || parseInt(raw, 10) > 1) {
            yrRef.current?.focus();
            yrRef.current?.select();
        }
        tryCommit(dd, raw, yyyy);
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
        setYyyy(raw);
        // If user typed a complete 4-digit year, jump the calendar
        if (raw.length === 4) {
            const y = parseInt(raw, 10);
            if (y >= 1900 && y <= 2100) {
                setNavYear(y);
                setView("days");
            }
        }
        tryCommit(dd, mm, raw);
    };

    // Arrow key navigation within segments
    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        setter: (v: string) => void,
        current: string,
        min: number,
        max: number,
        prevRef?: React.RefObject<HTMLInputElement | null>,
        nextRef?: React.RefObject<HTMLInputElement | null>,
    ) => {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            const n = Math.min(max, (parseInt(current, 10) || min - 1) + 1);
            setter(String(n).padStart(2, "0"));
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const n = Math.max(min, (parseInt(current, 10) || min + 1) - 1);
            setter(String(n).padStart(2, "0"));
        } else if (e.key === "Backspace" && !current) {
            prevRef?.current?.focus();
            prevRef?.current?.select();
        } else if (e.key === "Tab" && !e.shiftKey && nextRef) {
            // auto-handled
        }
    };

    const clearValue = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDd(""); setMm(""); setYyyy("");
        onChange("");
    };

    // ── Calendar logic ────────────────────────────────────────────────
    const totalDays = daysInMonth(navYear, navMonth);
    const startDay = firstDayOfMonth(navYear, navMonth);
    const daysArray = Array.from({ length: 42 }, (_, i) => {
        const dayNum = i - startDay + 1;
        return (dayNum > 0 && dayNum <= totalDays) ? dayNum : null;
    });

    const startYearGrid = navYear - 6;
    const yearsArray = Array.from({ length: 12 }, (_, i) => startYearGrid + i);

    const handleSelectDay = (day: number) => {
        const dateStr = `${navYear}-${String(navMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (minDate && dateStr < minDate) return;
        if (maxDate && dateStr > maxDate) return;
        onChange(dateStr);
        setDd(String(day).padStart(2, "0"));
        setMm(String(navMonth + 1).padStart(2, "0"));
        setYyyy(String(navYear));
        setIsOpen(false);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault();
        if (view === "days") {
            if (navMonth === 0) { setNavMonth(11); setNavYear(y => y - 1); }
            else setNavMonth(m => m - 1);
        } else if (view === "months") {
            setNavYear(y => y - 1);
        } else {
            setNavYear(y => y - 12);
        }
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        if (view === "days") {
            if (navMonth === 11) { setNavMonth(0); setNavYear(y => y + 1); }
            else setNavMonth(m => m + 1);
        } else if (view === "months") {
            setNavYear(y => y + 1);
        } else {
            setNavYear(y => y + 12);
        }
    };

    const hasValue = !!(dd || mm || yyyy);

    return (
        <div
            className={cn("relative w-full", className)}
            ref={containerRef}
        >
            {/* ── Trigger ── */}
            <div
                className={cn(
                    "flex items-center gap-1.5 w-full h-10 px-3 rounded-xl border border-input bg-background text-sm ring-offset-background transition-all cursor-text",
                    isOpen && "ring-2 ring-blue-500 border-blue-500",
                    disabled && "cursor-not-allowed opacity-50 pointer-events-none"
                )}
                onClick={() => { if (!disabled) { setIsOpen(true); dayRef.current?.focus(); } }}
            >
                <CalendarIcon
                    className="h-4 w-4 shrink-0 text-muted-foreground/50 cursor-pointer hover:text-blue-500 transition-colors"
                    onClick={(e) => { e.stopPropagation(); if (!disabled) setIsOpen(o => !o); }}
                />

                {/* Segmented input: DD / MM / YYYY */}
                <div className="flex items-center gap-0 flex-1 select-none font-mono">
                    <input
                        ref={dayRef}
                        type="text"
                        inputMode="numeric"
                        value={dd}
                        onChange={handleDayChange}
                        onKeyDown={(e) => handleKeyDown(e, setDd, dd, 1, 31, undefined, monRef)}
                        onFocus={() => setIsOpen(true)}
                        placeholder="DD"
                        maxLength={2}
                        className="w-7 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-center p-0 placeholder:text-muted-foreground/50 text-sm"
                    />
                    <span className="text-muted-foreground/60 select-none">/</span>
                    <input
                        ref={monRef}
                        type="text"
                        inputMode="numeric"
                        value={mm}
                        onChange={handleMonthChange}
                        onKeyDown={(e) => handleKeyDown(e, setMm, mm, 1, 12, dayRef, yrRef)}
                        onFocus={() => setIsOpen(true)}
                        placeholder="MM"
                        maxLength={2}
                        className="w-7 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-center p-0 placeholder:text-muted-foreground/50 text-sm"
                    />
                    <span className="text-muted-foreground/60 select-none">/</span>
                    <input
                        ref={yrRef}
                        type="text"
                        inputMode="numeric"
                        value={yyyy}
                        onChange={handleYearChange}
                        onKeyDown={(e) => handleKeyDown(e, setYyyy, yyyy, 1900, 2100, monRef, undefined)}
                        onFocus={() => setIsOpen(true)}
                        placeholder="YYYY"
                        maxLength={4}
                        className="w-12 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-center p-0 placeholder:text-muted-foreground/50 text-sm"
                    />
                </div>

                {/* Today pill inside the input bar */}
                {!hasValue && !disabled && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                            if (minDate && todayStr < minDate) return;
                            if (maxDate && todayStr > maxDate) return;
                            setNavYear(today.getFullYear());
                            setNavMonth(today.getMonth());
                            setView("days");
                            onChange(todayStr);
                            setDd(String(today.getDate()).padStart(2, "0"));
                            setMm(String(today.getMonth() + 1).padStart(2, "0"));
                            setYyyy(String(today.getFullYear()));
                            setIsOpen(false);
                        }}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700 uppercase tracking-wider transition-colors leading-4 shrink-0"
                    >
                        Today
                    </button>
                )}

                {/* Clear button */}
                {hasValue && !disabled && (
                    <button
                        type="button"
                        onClick={clearValue}
                        className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* ── Dropdown Calendar ── */}
            {isOpen && (
                <div ref={dropdownRef} className="absolute top-[calc(100%+6px)] left-0 z-50 w-[290px] rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 p-3">

                    {/* Nav Header */}
                    <div className="flex items-center justify-between mb-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handlePrev} type="button">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setView("months")}
                                className={cn(
                                    "text-sm font-semibold hover:bg-accent px-2 py-1 rounded-lg transition-colors",
                                    view === "months" && "bg-accent"
                                )}
                            >
                                {SHORT_MONTHS[navMonth]}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView(v => v === "years" ? "days" : "years")}
                                className={cn(
                                    "text-sm font-semibold hover:bg-accent px-2 py-1 rounded-lg transition-colors tabular-nums",
                                    view === "years" && "bg-accent"
                                )}
                            >
                                {navYear}
                            </button>
                        </div>

                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={handleNext} type="button">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Day Grid */}
                    {view === "days" && (
                        <div className="animate-in fade-in-0 duration-150">
                            <div className="grid grid-cols-7 mb-1.5">
                                {DAYS_OF_WEEK.map((d, i) => (
                                    <div key={d} className={cn("text-[10px] font-semibold text-center text-muted-foreground uppercase", (i === 0 || i === 6) && "text-rose-400")}>{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-y-0.5">
                                {daysArray.map((day, i) => {
                                    if (!day) return <div key={i} />;
                                    const dateStr = `${navYear}-${String(navMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const isSelected = value === dateStr;
                                    const isToday = new Date().toDateString() === new Date(navYear, navMonth, day).toDateString();
                                    const isWeekend = new Date(navYear, navMonth, day).getDay() === 0 || new Date(navYear, navMonth, day).getDay() === 6;
                                    const isDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate) || false;

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => handleSelectDay(day)}
                                            className={cn(
                                                "h-8 w-full rounded-lg text-xs flex items-center justify-center transition-all focus:outline-none font-medium",
                                                isDisabled && "opacity-30 cursor-not-allowed",
                                                !isDisabled && !isSelected && "hover:bg-accent hover:text-accent-foreground",
                                                !isDisabled && !isSelected && isWeekend && "text-rose-500",
                                                isSelected && "bg-blue-600 text-white font-bold shadow-md shadow-blue-200",
                                                !isSelected && isToday && "ring-1 ring-blue-400 bg-blue-50 text-blue-700 font-bold",
                                            )}
                                        >
                                            {day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Month Grid */}
                    {view === "months" && (
                        <div className="grid grid-cols-3 gap-2 py-1 animate-in fade-in-0 duration-150">
                            {SHORT_MONTHS.map((m, idx) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => { setNavMonth(idx); setView("days"); }}
                                    className={cn(
                                        "h-9 rounded-lg text-sm font-medium hover:bg-accent transition-all",
                                        idx === navMonth && "bg-blue-600 text-white font-bold shadow-sm shadow-blue-200",
                                    )}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Year Grid */}
                    {view === "years" && (
                        <div className="grid grid-cols-3 gap-2 py-1 animate-in fade-in-0 duration-150">
                            {yearsArray.map((y) => (
                                <button
                                    key={y}
                                    type="button"
                                    onClick={() => { setNavYear(y); setView("months"); }}
                                    className={cn(
                                        "h-9 rounded-lg text-sm font-medium hover:bg-accent transition-all tabular-nums",
                                        y === navYear && "bg-blue-600 text-white font-bold shadow-sm shadow-blue-200",
                                        y === new Date().getFullYear() && y !== navYear && "text-blue-600 font-bold",
                                    )}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Footer — Clear only */}
                    <div className="mt-3 pt-2.5 border-t flex items-center justify-end">
                        <button
                            type="button"
                            onClick={clearValue}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
