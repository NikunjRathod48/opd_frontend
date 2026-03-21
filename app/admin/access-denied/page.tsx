"use client";

import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccessDeniedPage() {
    const router = useRouter();

    return (
        <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-destructive/10 p-6">
                <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
            <p className="max-w-[400px] text-muted-foreground">
                You do not have the required permissions to view this page.
                Please contact your administrator if you believe this is an error.
            </p>
            <div className="flex gap-4">
                <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                </Button>
                <Button onClick={() => router.push("/dashboard")}>
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}
