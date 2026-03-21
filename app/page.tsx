"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Users, CalendarCheck, ArrowRight, CheckCircle2, FileText, LayoutDashboard, Snowflake } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import { LandingHeader } from "@/components/landing-header";

export default function LandingPage() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as any } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans selection:bg-primary/20 relative">
      <LandingHeader />

      <main className="flex-1 pt-16 relative overflow-hidden">
        {/* Animated Background Elements - Optimized */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.4, 0.3],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px]"
          />
        </div>

        {/* Hero Section */}
        <section className="relative z-10 py-16 md:py-24 lg:py-32 xl:py-40">

          <div className="container mx-auto px-6 text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="mx-auto max-w-4xl space-y-6"
            >
              <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight">
                Hospital Management <br />
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Reimagined.</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
                Streamline operations, enhance patient care, and maximize efficiency with the most advanced, secure, and intuitive healthcare platform.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/auth/register">
                  <Button size="lg" className="h-12 rounded-full text-white px-8 text-lg shadow-lg shadow-primary/25 transition-transform hover:scale-105">
                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="outline" size="lg" className="h-12 rounded-full px-8 text-lg hover:bg-muted/50">
                    Live Demo
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Hero Image / Dashboard Mockup Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 100, rotateX: 20 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mt-16 relative mx-auto max-w-5xl rounded-xl border bg-card p-2 shadow-2xl shadow-primary/10 perspective-1000"
            >
              <div className="rounded-lg bg-muted/20 aspect-[16/9] flex items-center justify-center overflow-hidden border">
                <div className="text-center space-y-4">
                  <LayoutDashboard className="h-24 w-24 text-primary/20 mx-auto" />
                  <p className="text-muted-foreground font-medium">Interactive Dashboard Preview</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5 }}
              className="mb-16 text-center max-w-3xl mx-auto"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to run a modern hospital</h2>
              <p className="mt-4 text-muted-foreground text-lg">Powerful features designed to reduce administrative burden and focus on what matters most: Patient Care.</p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              className="grid gap-6 md:gap-8 md:grid-cols-3"
            >
              <FeatureCard
                icon={CalendarCheck}
                title="Smart Scheduling"
                description="AI-powered appointment booking that reduces no-shows and optimizes doctor availability."
              />
              <FeatureCard
                icon={FileText}
                title="Electronic Records"
                description="Secure, centralized patient history accessible instantly. compliant with latest healthcare standards."
              />
              <FeatureCard
                icon={ShieldCheck}
                title="Enterprise Security"
                description="Role-based access control (RBAC) ensures data is only seen by authorized personnel."
              />
              <FeatureCard
                icon={Activity}
                title="Real-time Analytics"
                description="Track patient flow, revenue, and hospital occupancy with live interactive dashboards."
              />
              <FeatureCard
                icon={Users}
                title="Doctor Portal"
                description="Dedicated interface for doctors to manage consultations, prescriptions, and vitals."
              />
              <FeatureCard
                icon={CheckCircle2}
                title="Automated Billing"
                description="Generate invoices, track payments, and handle insurance claims seamlessy."
              />
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24">
          <div className="container mx-auto px-6 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5 }}
              className="mb-10 text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6 }}
            >
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I get started with MedCore?</AccordionTrigger>
                  <AccordionContent>
                    Simply click on "Get Started" to create a new organization account. You can then invite doctors and staff members.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Is patient data secure?</AccordionTrigger>
                  <AccordionContent>
                    Yes. We use enterprise-grade encryption for all data at rest and in transit. Access is strictly controlled via Role-Based Access Control (RBAC).
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>Can I manage multiple clinics?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely. MedCore is designed for multi-location hospitals and clinics, allowing centralized management from a single admin dashboard.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Is there a free trial?</AccordionTrigger>
                  <AccordionContent>
                    Yes, we offer a 14-day full-featured free trial for new organizations. No credit card required.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12">
        <div className="container mx-auto px-6 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xl font-bold text-primary-foreground shadow-sm">
              M
            </div>
            <span className="font-bold text-lg tracking-tight">MedCore</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MedCore Systems Inc. All rights reserved.
          </p>
          <div className="flex gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group rounded-2xl border bg-card p-6 md:p-8 shadow-sm transition-all hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20"
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-3 text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
