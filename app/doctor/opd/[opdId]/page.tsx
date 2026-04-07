"use client";

import { RoleGuard } from "@/components/auth/role-guard";
import { OpdWorkspace } from "@/components/modules/queues/opd-workspace";
import { ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";

interface Props {
    params: Promise<{ opdId: string }>;
}

export default function OpdDetailPage({ params }: Props) {
    const { opdId } = use(params);
    const router = useRouter();

    return (
        <RoleGuard allowedRoles={["Doctor", "HospitalAdmin"]}>
            <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
                {/* ── Sticky top bar ── */}
                <div className="sticky top-0 z-20 border-b border-border/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
                    <div className="max-w-screen-2xl mx-auto flex items-center gap-3 px-6 h-14">
                        <Link
                            href="/doctor/opd"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                            Back to OPD List
                        </Link>
                        <span className="text-muted-foreground/30 select-none">/</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <ClipboardList className="h-4 w-4 text-violet-600" />
                            Visit Detail
                        </div>
                        <div className="ml-auto">
                            <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                                OPD #{opdId}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── 3-col workspace — no onDone (no queue token here), only discharge ── */}
                <div className="max-w-screen-2xl mx-auto px-6 py-6">
                    <OpdWorkspace
                        opdId={Number(opdId)}
                        onDischarge={() => router.push("/doctor/opd")}
                    />
                </div>
            </div>
        </RoleGuard>
    );
}
