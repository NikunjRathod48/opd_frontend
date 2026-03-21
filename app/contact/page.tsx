"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { motion } from "framer-motion";

import { LandingHeader } from "@/components/landing-header";

export default function ContactPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background font-sans">
            <LandingHeader />

            <main className="flex-1 pt-24 pb-16">
                <div className="container mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-3xl mx-auto mb-16"
                    >
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">Get in Touch</h1>
                        <p className="text-lg text-muted-foreground">
                            Have questions about MedCore? Our team is available 24/7 to assist you.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        {/* Contact Info */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-8"
                        >
                            <div className="p-8 rounded-2xl bg-muted/30 border space-y-6">
                                <h3 className="text-xl font-bold">Contact Information</h3>

                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Email Us</p>
                                        <p className="font-semibold">support@medcore.com</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Phone className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Call Us</p>
                                        <p className="font-semibold">+1 (555) 123-4567</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Visit Us</p>
                                        <p className="font-semibold">123 Health Tech Blvd, San Francisco, CA</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Form */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-8 rounded-2xl bg-card border shadow-lg"
                        >
                            <form className="space-y-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input placeholder="John Doe" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Email Address</label>
                                    <Input type="email" placeholder="john@example.com" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Message</label>
                                    <textarea
                                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="How can we help you?"
                                    />
                                </div>
                                <Button className="w-full text-white">
                                    Send Message <Send className="ml-2 h-4 w-4" />
                                </Button>
                            </form>
                        </motion.div>

                    </div>
                </div>
            </main>
        </div>
    );
}
