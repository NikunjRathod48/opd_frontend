"use client";

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground/50">
                <Sun className="h-[1.2rem] w-[1.2rem]" />
            </Button>
        )
    }

    // If resolvedTheme is dark, we are in dark mode -> Show Sun to switch to light
    // If resolvedTheme is light, we are in light mode -> Show Moon to switch to dark
    const isDark = resolvedTheme === "dark" || theme === "dark"

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative rounded-full hover:bg-muted transition-colors duration-300"
        >
            {isDark ? (
                <Sun className="h-[1.2rem] w-[1.2rem] transition-all duration-300 text-amber-500 animate-in spin-in-90 fade-in" />
            ) : (
                <Moon className="h-[1.2rem] w-[1.2rem] transition-all duration-300 text-slate-700 animate-in spin-in-90 fade-in" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
