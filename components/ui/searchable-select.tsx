"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SearchableSelectOption {
    label: string;
    value: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string; // For wrapper
    inputClassName?: string; // For inner input
    emptyMessage?: string;
    disabled?: boolean;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select option...",
    className,
    inputClassName,
    emptyMessage = "No results found.",
    disabled = false,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Sync query with value
    React.useEffect(() => {
        if (value) {
            const selectedOption = options.find((opt) => opt.value === value);
            if (selectedOption) {
                setQuery(selectedOption.label);
            }
        } else {
            setQuery("");
        }
    }, [value, options]);

    // Reset highlighted index when filtering changes
    React.useEffect(() => {
        setHighlightedIndex(0);
    }, [query]);

    // Auto-scroll on open
    React.useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [isOpen]);

    // ... (click outside)

    const filteredOptions = options.filter((option) =>
        (option?.label || "").toLowerCase().includes(query.toLowerCase().trim())
    );

    const handleSelect = (optionValue: string, optionLabel: string) => {
        onChange(optionValue);
        setQuery(optionLabel);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
            setHighlightedIndex((prev) =>
                prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIsOpen(true);
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (isOpen && filteredOptions.length > 0) {
                const option = filteredOptions[highlightedIndex];
                if (option) {
                    handleSelect(option.value, option.label);
                }
            } else {
                setIsOpen(true);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setIsOpen(true);
        if (e.target.value === "") {
            onChange("");
        }
    };

    const clearSelection = () => {
        onChange("");
        setQuery("");
        setIsOpen(false);
    };

    return (
        <div className={cn("relative w-full", isOpen && "z-50", className)} ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onBlur={(e) => {
                        if (
                            containerRef.current &&
                            !containerRef.current.contains(e.relatedTarget as Node)
                        ) {
                            setIsOpen(false);
                            const selectedOption = options.find((opt) => opt.value === value);
                            if (selectedOption) {
                                setQuery(selectedOption.label);
                            } else if (!value) {
                                setQuery("");
                            }
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn("h-10 pl-9 pr-9", inputClassName)}
                />
                {value && !disabled && (
                    <button
                        onClick={clearSelection}
                        className="absolute right-3 top-3 hover:text-destructive transition-colors"
                    >
                        <X className="h-4 w-4 text-muted-foreground hover:text-inherit" />
                    </button>
                )}
            </div>

            {isOpen && !disabled && (
                <div className="absolute top-[calc(100%+4px)] left-0 z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                    <div className="max-h-[200px] w-full overflow-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800 scrollbar-track-transparent">
                        <div className="p-1">
                            {filteredOptions.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    {emptyMessage}
                                </div>
                            ) : (
                                filteredOptions.map((option, index) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSelect(option.value, option.label)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                        className={cn(
                                            "relative flex w-full min-w-max cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                                            (index === highlightedIndex)
                                                ? "bg-accent text-accent-foreground"
                                                : "text-popover-foreground"
                                        )}
                                    >
                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center opacity-0 transition-opacity", value === option.value && "opacity-100")}>
                                            <Check className="h-4 w-4" />
                                        </div>
                                        <span className="text-left whitespace-nowrap">{option.label}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
