"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Target, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { ModeToggle } from "@/components/mode-toggle";

import { LandingHeader } from "@/components/landing-header";

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background font-sans">
            <LandingHeader />

            <main className="flex-1 pt-24 pb-16">
                <div className="container mx-auto px-6">
                    {/* Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-3xl mx-auto mb-20"
                    >
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-6">Revolutionizing Healthcare Management</h1>
                        <p className="text-lg text-muted-foreground">
                            At MedCore, we believe that technology should empower healthcare providers, not complicate them. Our mission is to build the world's most intuitive OPD management system.
                        </p>
                    </motion.div>

                    {/* Values Grid */}
                    <div className="grid gap-12 md:grid-cols-3 mb-24">
                        <ValueCard
                            icon={Target}
                            title="Mission Driven"
                            description="We are dedicated to reducing administrative burden so doctors can focus 100% on patients."
                        />
                        <ValueCard
                            icon={Heart}
                            title="Patient First"
                            description="Every feature we build is designed to improve the patient experience and care outcomes."
                        />
                        <ValueCard
                            icon={Users}
                            title="Collaborative"
                            description="We work closely with hospitals and clinics to understand their real-world challenges."
                        />
                    </div>

                    {/* Team Section */}
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold tracking-tight mb-12">Meet Our Leadership</h2>
                        <div className="grid gap-8 md:grid-cols-3">
                            <TeamMember name="Dr. Sarah Chen" role="Chief Medical Officer" />
                            <TeamMember name="James Wilson" role="CTO & Founder" />
                            <TeamMember name="Maria Rodriguez" role="Head of Product" />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t bg-muted/20 py-12">
                <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
                    © 2024 MedCore Systems Inc.
                </div>
            </footer>
        </div>
    );
}

function ValueCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="text-center space-y-4 p-6 rounded-2xl bg-muted/30 border"
        >
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
        </motion.div>
    )
}

function TeamMember({ name, role }: { name: string, role: string }) {
    return (
        <div className="group relative overflow-hidden rounded-2xl bg-card border p-6 hover:shadow-lg transition-all">
            <div className="h-32 w-32 mx-auto rounded-full bg-muted mb-4 group-hover:bg-primary/10 transition-colors" />
            <h3 className="text-lg font-bold">{name}</h3>
            <p className="text-sm text-primary font-medium">{role}</p>
        </div>
    )
}
