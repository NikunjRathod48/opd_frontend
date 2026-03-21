import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-6 p-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <div className="rounded-full bg-red-100 p-4">
                    <ShieldAlert className="h-12 w-12 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">401: Authorization Required</h1>
                <p className="text-slate-500 max-w-[500px]">
                    You do not have permission to access this page. Please log in with an account that has the necessary privileges.
                </p>
            </div>

            <div className="flex gap-4">
                <Button asChild variant="outline">
                    <Link href="/">
                        Return Home
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/auth/login">
                        Login
                    </Link>
                </Button>
            </div>
        </div>
    );
}
