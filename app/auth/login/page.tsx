"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, UserRole } from "@/context/auth-context";
import { ChevronLeft, Eye, EyeOff, Mail, KeyRound, CheckCircle2, ArrowLeft, Loader2, ShieldCheck, RotateCcw, Lock, Sparkles, AlertCircle, Clock, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

// ─── Forgot Password Modal ─────────────────────────────────────────────────

type FpStep = "email" | "otp" | "newPassword";

// Slide transition variants — new step slides in from right, old slides out to left
const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const STEPS: FpStep[] = ["email", "otp", "newPassword"];

function ForgotPasswordModal({ open, onClose, initialEmail, onSuccess }: { open: boolean; onClose: () => void; initialEmail?: string; onSuccess: () => void }) {
    const [step, setStep] = useState<FpStep>("email");
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [otpExpiry, setOtpExpiry] = useState(600); // 10 minutes in seconds
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const expiryRef = useRef<NodeJS.Timeout | null>(null);

    const goToStep = (next: FpStep) => {
        const cur = STEPS.indexOf(step);
        const nxt = STEPS.indexOf(next);
        setDirection(nxt >= cur ? 1 : -1);
        setStep(next);
        setError("");
    };

    const startCountdown = (seconds: number) => {
        setCountdown(seconds);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const startOtpExpiry = () => {
        setOtpExpiry(600);
        if (expiryRef.current) clearInterval(expiryRef.current);
        expiryRef.current = setInterval(() => {
            setOtpExpiry(prev => {
                if (prev <= 1) { clearInterval(expiryRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setStep("email"); setEmail(""); setOtp(["", "", "", "", "", ""]);
                setNewPassword(""); setConfirmPassword(""); setError(""); setCountdown(0); setOtpExpiry(600);
                if (timerRef.current) clearInterval(timerRef.current);
                if (expiryRef.current) clearInterval(expiryRef.current);
            }, 300);
        } else if (initialEmail && step === "email") {
            setEmail(initialEmail);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (expiryRef.current) clearInterval(expiryRef.current);
        };
    }, [open, initialEmail]);

    const handleSendOtp = async () => {
        const trimmedEmail = email.trim();
        if (!trimmedEmail) { setError("Please enter your email address."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError("Please enter a valid email address."); return; }
        setLoading(true); setError("");
        try {
            await api.post("/auth/forgot-password", { email: trimmedEmail });
            goToStep("otp");
            startCountdown(60);
            startOtpExpiry();
            setTimeout(() => otpRefs.current[0]?.focus(), 150);
        } catch (err: any) { setError(err.message || "Failed to send OTP. Please try again."); }
        finally { setLoading(false); }
    };

    const handleVerifyOtp = async () => {
        const otpStr = otp.join("");
        if (otpStr.length !== 6) { setError("Please enter the complete 6-digit OTP."); return; }
        setLoading(true); setError("");
        try {
            await api.post("/auth/verify-otp", { email: email.trim(), otp: otpStr });
            goToStep("newPassword");
        } catch (err: any) {
            setError(err.message || "Invalid OTP. Please try again.");
            setOtp(["", "", "", "", "", ""]);
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        } finally { setLoading(false); }
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
        setLoading(true); setError("");
        try {
            await api.post("/auth/reset-password", { email: email.trim(), otp: otp.join(""), newPassword });
            onClose();
            setTimeout(() => onSuccess(), 300);
        } catch (err: any) { setError(err.message || "Failed to reset password. Please try again."); }
        finally { setLoading(false); }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
        if (e.key === "Enter") handleVerifyOtp();
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newOtp = [...otp];
        pasted.split("").forEach((char, i) => { newOtp[i] = char; });
        setOtp(newOtp);
        const nextEmpty = newOtp.findIndex(v => !v);
        otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    };

    const stepIndex = { email: 0, otp: 1, newPassword: 2, success: 3 } as const;
    const currentStepIdx = stepIndex[step];
    const progressSteps = [
        { label: "Email", icon: <Mail className="h-3 w-3" /> },
        { label: "Verify", icon: <ShieldCheck className="h-3 w-3" /> },
        { label: "Reset", icon: <KeyRound className="h-3 w-3" /> },
    ];

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-0 shadow-2xl">

                {/* ── Animated Header ── */}
                <div className="relative bg-gradient-to-br from-blue-950 via-blue-800 to-indigo-700 px-6 pt-6 pb-7 text-white overflow-hidden">
                    {/* Background decorative circles */}
                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
                    <div className="absolute top-4 right-16 w-8 h-8 rounded-full bg-blue-400/20" />

                    {/* Logo + Brand */}
                    <div className="relative flex items-center gap-3 mb-5">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="relative"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm text-lg font-black border border-white/25 shadow-lg">
                                M
                            </div>
                            {/* Pulse ring */}
                            <motion.div
                                className="absolute inset-0 rounded-xl border-2 border-white/30"
                                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2.5, repeat: Infinity }}
                            />
                        </motion.div>
                        <div>
                            <span className="text-base font-bold tracking-tight">MedCore</span>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                <span className="text-xs text-blue-200 font-medium">Secure Portal</span>
                            </div>
                        </div>
                    </div>

                    {/* Animated title + description */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step + "-header"}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            <DialogTitle className="text-white text-xl font-bold leading-tight">
                                {step === "email" && "Forgot Password?"}
                                {step === "otp" && "Check Your Email"}
                                {step === "newPassword" && "Set New Password"}
                            </DialogTitle>
                            <DialogDescription className="text-blue-200 text-sm mt-1.5 leading-relaxed">
                                {step === "email" && "Enter your registered email and we'll send a verification code."}
                                {step === "otp" && <><span className="text-white font-medium">{email}</span> — check your inbox for the code.</>}
                                {step === "newPassword" && "Choose a strong password you haven't used before."}
                            </DialogDescription>
                        </motion.div>
                    </AnimatePresence>

                    {/* Step Progress Bar */}
                    <div className="flex items-center gap-0 mt-5">
                            {progressSteps.map((s, i) => {
                                const done = i < currentStepIdx;
                                const active = i === currentStepIdx;
                                return (
                                    <div key={s.label} className="flex items-center">
                                        <motion.div
                                            animate={{
                                                backgroundColor: done ? "#4ade80" : active ? "#fff" : "rgba(255,255,255,0.2)",
                                                scale: active ? 1.1 : 1,
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shadow-sm"
                                            style={{ color: done ? "#fff" : active ? "#1e3a8a" : "rgba(255,255,255,0.5)" }}
                                        >
                                            {done ? <CheckCircle2 className="h-4 w-4" /> : s.icon}
                                        </motion.div>
                                        <motion.span
                                            animate={{ opacity: active ? 1 : 0.5 }}
                                            className="text-xs font-medium ml-1.5 mr-1"
                                            style={{ color: active ? "#fff" : "rgba(255,255,255,0.5)" }}
                                        >
                                            {s.label}
                                        </motion.span>
                                        {i < progressSteps.length - 1 && (
                                            <div className="relative mx-2 w-8 h-0.5 bg-white/20 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="absolute inset-y-0 left-0 bg-green-400 rounded-full"
                                                    animate={{ width: done ? "100%" : "0%" }}
                                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                </div>

                {/* ── Body ── */}
                <div className="relative overflow-hidden" style={{ minHeight: 220 }}>

                    {/* Animated Error Banner */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, y: -10, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mx-6 mt-4 p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2"
                            >
                                <motion.div
                                    animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                                    transition={{ duration: 0.5 }}
                                    className="shrink-0 mt-0.5"
                                >
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                </motion.div>
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Animated Step Content */}
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="px-6 py-5 space-y-4"
                        >

                            {/* ── Step 1: Email ── */}
                            {step === "email" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-foreground">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                            <Input
                                                id="fp-email"
                                                type="email"
                                                placeholder="your@email.com"
                                                className="h-11 pl-10 transition-all border-border focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                                                disabled={loading}
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">We'll send a 6-digit code to this email.</p>
                                    </div>
                                    <motion.div whileTap={{ scale: 0.98 }}>
                                        <Button
                                            id="fp-send-otp-btn"
                                            className="w-full h-11 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                                            onClick={handleSendOtp}
                                            disabled={loading}
                                        >
                                            {loading
                                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending code...</>
                                                : <><Sparkles className="h-4 w-4 mr-2" /> Send Verification Code</>
                                            }
                                        </Button>
                                    </motion.div>
                                </div>
                            )}

                            {/* ── Step 2: OTP ── */}
                            {step === "otp" && (
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold text-foreground">Verification Code</label>
                                        {/* OTP Digit Boxes */}
                                        <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                                            {otp.map((digit, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 20 }}
                                                >
                                                    <motion.input
                                                        ref={el => { otpRefs.current[i] = el; }}
                                                        id={`fp-otp-${i}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                        disabled={loading}
                                                        animate={digit ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                                                        transition={{ duration: 0.15 }}
                                                        className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 bg-background outline-none transition-colors cursor-text
                                                            ${digit
                                                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                                                                : "border-border hover:border-blue-300"
                                                            }
                                                            focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.2)]`}
                                                        style={{ height: "3.25rem" }}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                        <div className="space-y-1.5 mt-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> Expires in:
                                                </span>
                                                <span className={`font-mono font-medium ${
                                                    otpExpiry > 180 ? "text-green-600" :
                                                    otpExpiry > 60 ? "text-yellow-600" : "text-red-500 font-bold"
                                                }`}>
                                                    {Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, "0")}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    initial={{ width: "100%", backgroundColor: "#22c55e" }}
                                                    animate={{
                                                        width: `${(otpExpiry / 600) * 100}%`,
                                                        backgroundColor: otpExpiry > 180 ? "#22c55e" : otpExpiry > 60 ? "#eab308" : "#ef4444"
                                                    }}
                                                    transition={{ duration: 1, ease: "linear" }}
                                                />
                                            </div>
                                            {otpExpiry === 0 && (
                                                <p className="text-xs text-red-500 text-center animate-pulse pt-1">OTP has expired. Please resend.</p>
                                            )}
                                        </div>
                                    </div>
                                    <motion.div whileTap={{ scale: 0.98 }}>
                                        <Button
                                            id="fp-verify-otp-btn"
                                            className="w-full h-11 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all"
                                            onClick={handleVerifyOtp}
                                            disabled={loading || otp.join("").length !== 6}
                                        >
                                            {loading
                                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                                                : <><ShieldCheck className="h-4 w-4 mr-2" /> Verify Code</>
                                            }
                                        </Button>
                                    </motion.div>
                                    {/* Resend row */}
                                    <div className="flex items-center justify-between text-sm pt-1">
                                        <button
                                            type="button"
                                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs"
                                            onClick={() => goToStep("email")}
                                        >
                                            <ArrowLeft className="h-3 w-3" /> Change email
                                        </button>
                                        <AnimatePresence mode="wait">
                                            {countdown > 0 ? (
                                                <motion.span
                                                    key="countdown"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="text-xs text-muted-foreground tabular-nums"
                                                >
                                                    Resend in <span className="text-foreground font-semibold">{countdown}s</span>
                                                </motion.span>
                                            ) : (
                                                <motion.button
                                                    key="resend"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    type="button"
                                                    id="fp-resend-btn"
                                                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                                                    onClick={async () => {
                                                        setError(""); setOtp(["", "", "", "", "", ""]); setLoading(true);
                                                        try {
                                                            await api.post("/auth/forgot-password", { email: email.trim() });
                                                            startCountdown(60);
                                                            startOtpExpiry();
                                                            setTimeout(() => otpRefs.current[0]?.focus(), 100);
                                                        } catch (err: any) { setError(err.message || "Failed to resend OTP."); }
                                                        finally { setLoading(false); }
                                                    }}
                                                    disabled={loading}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.97 }}
                                                >
                                                    <RotateCcw className="h-3 w-3" /> Resend Code
                                                </motion.button>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 3: New Password ── */}
                            {step === "newPassword" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-foreground">New Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                            <Input
                                                id="fp-new-password"
                                                type={showNewPw ? "text" : "password"}
                                                placeholder="Min. 6 characters"
                                                className="h-11 pl-10 pr-10 transition-all focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
                                                value={newPassword}
                                                onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                                                disabled={loading}
                                                autoFocus
                                            />
                                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNewPw(!showNewPw)}>
                                                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {/* Password strength indicator */}
                                        {newPassword.length > 0 && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4].map(level => (
                                                        <div key={level} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                                            newPassword.length >= level * 2
                                                                ? level <= 1 ? "bg-red-400"
                                                                : level <= 2 ? "bg-yellow-400"
                                                                : level <= 3 ? "bg-blue-400"
                                                                : "bg-green-500"
                                                                : "bg-muted"
                                                        }`} />
                                                    ))}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {newPassword.length < 4 ? "Too short" : newPassword.length < 6 ? "Weak" : newPassword.length < 8 ? "Fair" : "Strong ✓"}
                                                </p>
                                            </motion.div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-foreground">Confirm Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                            <Input
                                                id="fp-confirm-password"
                                                type={showConfirmPw ? "text" : "password"}
                                                placeholder="Repeat your password"
                                                className={`h-11 pl-10 pr-10 transition-all ${confirmPassword && confirmPassword !== newPassword ? "border-red-400 focus-visible:ring-red-300" : confirmPassword && confirmPassword === newPassword ? "border-green-400" : ""}`}
                                                value={confirmPassword}
                                                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                                onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                                                disabled={loading}
                                            />
                                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                                                {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <AnimatePresence>
                                            {confirmPassword && newPassword && confirmPassword !== newPassword && (
                                                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-500">
                                                    Passwords do not match.
                                                </motion.p>
                                            )}
                                            {confirmPassword && newPassword && confirmPassword === newPassword && (
                                                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-green-600 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Passwords match!
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <motion.div whileTap={{ scale: 0.98 }}>
                                        <Button
                                            id="fp-reset-btn"
                                            className="w-full h-11 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all"
                                            onClick={handleResetPassword}
                                            disabled={loading || !newPassword || !confirmPassword}
                                        >
                                            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating password...</> : "Reset Password"}
                                        </Button>
                                    </motion.div>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}


// ─── Main Login Page ───────────────────────────────────────────────────────


export default function LoginPage() {
    const { login, loginWithCredentials, isLoading } = useAuth();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [forgotOpen, setForgotOpen] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    return (
        <>
            <ForgotPasswordModal 
                open={forgotOpen} 
                onClose={() => setForgotOpen(false)} 
                initialEmail={identifier}
                onSuccess={() => setResetSuccess(true)}
            />

            <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
                {/* Left Column: Branding/Image */}
                <div className="relative hidden h-full flex-col justify-between p-10 text-white lg:flex">
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

                    <div className="relative z-20 flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-2xl font-bold text-white shadow-lg border border-white/20">
                            M
                        </div>
                        <span className="text-2xl font-bold tracking-tight">MedCore</span>
                    </div>

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
                    <div className="w-full max-w-[600px] space-y-6">

                        {/* Mobile Logo */}
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
                            {resetSuccess ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    className="space-y-6 text-center py-8 bg-background rounded-2xl shadow-sm border border-border p-8"
                                >
                                    <div className="flex justify-center">
                                        <div className="relative">
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                                                className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 border-4 border-green-200 shadow-inner"
                                            >
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.25 }}
                                                >
                                                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                                                </motion.div>
                                            </motion.div>
                                            {/* Ripple rings */}
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    className="absolute inset-0 rounded-full border-2 border-green-300"
                                                    initial={{ scale: 1, opacity: 0.6 }}
                                                    animate={{ scale: 2.2, opacity: 0 }}
                                                    transition={{ duration: 1.2, delay: i * 0.3, repeat: 0 }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <h2 className="text-2xl font-bold text-foreground">Password Updated!</h2>
                                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[280px] mx-auto">
                                            Your password has been successfully reset. You can now sign in with your new credentials.
                                        </p>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.55 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Button
                                            className="w-full h-11 text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md transition-all mt-4"
                                            onClick={() => { setResetSuccess(false); setPassword(""); }}
                                        >
                                            Sign In Now
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            ) : (
                                <>
                                    <form className="space-y-4" onSubmit={async (e) => {
                                        e.preventDefault();
                                        setError("");

                                        const trimmedIdentifier = identifier.trim();
                                        const trimmedPassword = password.trim();

                                        if (!trimmedIdentifier || !trimmedPassword) {
                                            setError("Please enter both identifier and password");
                                            return;
                                        }

                                        const result = await loginWithCredentials(trimmedIdentifier, trimmedPassword);
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
                                                id="login-identifier"
                                                type="email"
                                                placeholder="Email"
                                                className="h-11"
                                                value={identifier}
                                                onChange={(e) => setIdentifier(e.target.value)}
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="relative">
                                                <Input
                                                    id="login-password"
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

                                            {/* Forgot Password link */}
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    id="forgot-password-btn"
                                                    onClick={() => setForgotOpen(true)}
                                                    className="text-xs text-primary hover:underline underline-offset-4 font-medium"
                                                >
                                                    Forgot password?
                                                </button>
                                            </div>
                                        </div>

                                        <Button id="login-submit-btn" className="w-full h-11 text-white" disabled={isLoading} type="submit">
                                            {isLoading ? "Signing in..." : "Sign In with Credentials"}
                                        </Button>
                                    </form>

                                    <p className="px-8 text-center text-sm text-muted-foreground">
                                        Don't have an account?{" "}
                                        <Link href="/auth/register" className="underline underline-offset-4 hover:text-primary font-medium">
                                            Register as Patient
                                        </Link>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
