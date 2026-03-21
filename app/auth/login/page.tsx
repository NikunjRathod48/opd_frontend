"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth, UserRole } from "@/context/auth-context";
import { Activity, Stethoscope, User, Shield, BookOpen, ChevronLeft, Building2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const { login, loginWithCredentials, isLoading } = useAuth();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const handleRoleLogin = (role: UserRole) => {
        login(role);
    };

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Left Column: Branding/Image */}
            <div className="relative hidden h-full flex-col justify-between p-10 text-white lg:flex">
                {/* Background Image */}
                <div className="absolute inset-0 bg-blue-900">
                    <Image
                        src="/auth_bg_premium.png"
                        alt="Medical Background"
                        fill
                        className="object-cover opacity-80 mix-blend-overlay"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-blue-900/40" />
                </div>

                {/* Logo Area */}
                <div className="relative z-20 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-2xl font-bold text-white shadow-lg border border-white/20">
                        M
                    </div>
                    <span className="text-2xl font-bold tracking-tight">MedCore</span>
                </div>

                {/* Quote/Testimonial Area */}
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg font-medium leading-relaxed">
                            &ldquo;MedCore has completely transformed how we manage patient records and appointments. It's not just software; it's the backbone of our clinic.&rdquo;
                        </p>
                        <footer className="text-sm font-medium text-blue-200">
                            Dr. Sarah Mitchell, Chief of Cardiology
                        </footer>
                    </blockquote>
                </div>
            </div>

            {/* Right Column: Form */}
            <div className="flex items-center justify-center p-8 bg-muted/20 lg:p-12">
                <div className="w-full max-w-[600px] space-y-6"> {/* Increased width for 3 columns */}

                    {/* Mobile Logo (Visible only on small screens) */}
                    <div className="flex flex-col space-y-2 text-center lg:hidden lg:text-left mb-8">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg mb-4">
                            M
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">MedCore</h1>
                    </div>

                    {/* Back Button */}
                    <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Home
                    </Link>

                    <div className="flex flex-col space-y-2 text-center lg:text-left">
                        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                        <p className="text-muted-foreground">
                            Choose your portal to sign in securely.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <form className="space-y-4" onSubmit={async (e) => {
                            e.preventDefault();
                            setError("");
                            if (!identifier || !password) {
                                setError("Please enter both identifier and password");
                                return;
                            }

                            const result = await loginWithCredentials(identifier, password);
                            if (!result.success) {
                                setError(result.error || "Login failed");
                            }
                        }}>
                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    placeholder="Email or Phone Number"
                                    className="h-11"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="relative space-y-2">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="h-11 pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-11 w-11 px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="sr-only">
                                        {showPassword ? "Hide password" : "Show password"}
                                    </span>
                                </Button>
                            </div>
                            <Button className="w-full h-11 text-white" disabled={isLoading} type="submit">
                                {isLoading ? "Signing in..." : "Sign In with Credentials"}
                            </Button>
                        </form>

                        <p className="px-8 text-center text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link href="/auth/register" className="underline underline-offset-4 hover:text-primary font-medium">
                                Register as Patient
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RoleButton({ role, icon: Icon, label, onClick, disabled }: { role: string, icon: any, label: string, onClick: () => void, disabled: boolean }) {
    return (
        <Button
            variant="outline"
            className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5 transition-all text-center border-2 border-transparent hover:border-primary/20 bg-background shadow-sm hover:shadow-md"
            onClick={onClick}
            disabled={disabled}
        >
            <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
            </div>
            <span className="font-semibold text-sm">{label}</span>
        </Button>
    )
}
