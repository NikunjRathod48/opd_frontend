"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LayoutDashboard, ArrowLeft, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function UnauthorizedPage() {
    const router = useRouter();
    const { getRoleBasePath } = useAuth();
    const dashboardPath = getRoleBasePath ? getRoleBasePath() : "/";

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white overflow-hidden relative selection:bg-red-100 selection:text-red-900">

            {/* Background Grid - Very Subtle */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] opacity-60" />

            {/* EKG Line Background */}
            <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 opacity-5 pointer-events-none">
                <svg width="100%" height="200" viewBox="0 0 1200 200" preserveAspectRatio="none">
                    <path
                        d="M0,100 L200,100 L230,10 L260,190 L290,100 L400,100 L430,10 L460,190 L490,100 L1200,100"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="4"
                    />
                </svg>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 flex flex-col items-center max-w-2xl px-4"
            >
                {/* Shield Icon Container */}
                <div className="relative mb-8">
                    <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100 shadow-xl shadow-red-100/50"
                    >
                        <ShieldAlert className="w-16 h-16 text-red-500" strokeWidth={2.5} />
                    </motion.div>

                    {/* Ripple Effects */}
                    <motion.div
                        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-red-100 rounded-full -z-10"
                    />
                </div>

                {/* Typography */}
                <h1 className="text-7xl md:text-8xl font-black text-slate-900 tracking-tighter mb-2">
                    4<span className="text-red-500">0</span>1
                </h1>

                <h2 className="text-2xl font-semibold text-slate-700 mb-4 tracking-tight">
                    Access Denied
                </h2>

                <p className="text-slate-500 text-center max-w-md mb-10 leading-relaxed text-lg">
                    You do not have high enough clearance to view this page. <br />
                    Please contact an administrator or switch accounts.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => router.back()}
                        className="h-12 px-8 border border-slate-200 text-slate-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-300 font-medium rounded-full"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>

                    <Button
                        size="lg"
                        onClick={() => router.push(dashboardPath)}
                        className="h-12 px-8 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-1 transition-all duration-300 rounded-full font-medium"
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                    </Button>
                </div>
            </motion.div>

            {/* Bottom Decor */}
            <div className="absolute bottom-0 w-full h-2 bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0" />
        </div>
    );
}
