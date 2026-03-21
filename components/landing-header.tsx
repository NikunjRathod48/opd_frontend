"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Snowflake, Menu, X } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function LandingHeader() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
                <div className="container mx-auto flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2">
                        <Link href="/landing" className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xl font-bold text-primary-foreground shadow-lg">
                                M
                            </div>
                            <span className="text-xl font-bold tracking-tight">MedCore</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <ModeToggle />
                        <div className="h-6 w-px bg-border hidden sm:block"></div>
                        <nav className="hidden md:flex items-center gap-6 mr-4 text-sm font-medium">
                            <Link href="/landing" className="hover:text-primary transition-colors">Home</Link>
                            <Link href="/about" className="hover:text-primary transition-colors">About</Link>
                            <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                        </nav>
                        <Link href="/auth/login">
                            <Button variant="ghost" className="font-medium hidden sm:inline-flex">Log In</Button>
                        </Link>
                        <Link href="/auth/register" className="hidden md:inline-flex">
                            <Button className="rounded-full text-white px-6 shadow-md shadow-primary/20">Get Started</Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-40 bg-background pt-24 px-6 md:hidden"
                    >
                        <nav className="flex flex-col gap-6 text-lg font-medium">
                            <Link
                                href="/landing"
                                className="hover:text-primary transition-colors border-b pb-4"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Home
                            </Link>
                            <Link
                                href="/about"
                                className="hover:text-primary transition-colors border-b pb-4"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                About
                            </Link>
                            <Link
                                href="/contact"
                                className="hover:text-primary transition-colors border-b pb-4"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Contact
                            </Link>
                            <div className="flex flex-col gap-4 mt-4">
                                <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="outline" className="w-full text-lg h-12">Log In</Button>
                                </Link>
                                <Link href="/auth/register" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full text-lg text-white h-12 shadow-md shadow-primary/20">Get Started</Button>
                                </Link>
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
