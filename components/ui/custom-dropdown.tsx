"use client";

import * as React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export interface CustomDropdownOption {
    label: string;
    value: string;
}

interface CustomDropdownProps {
    options: CustomDropdownOption[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function CustomDropdown({
    options,
    value,
    onChange,
    placeholder = "Select option",
    className,
    disabled = false,
}: CustomDropdownProps) {
    return (
        <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled}
        >
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
