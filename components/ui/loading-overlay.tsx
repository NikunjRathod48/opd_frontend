import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
    isLoading: boolean;
    text?: string;
}

export function LoadingOverlay({ isLoading, text = "Loading..." }: LoadingOverlayProps) {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background/80 backdrop-blur-md border shadow-lg rounded-xl p-6 flex flex-col items-center gap-3 min-w-[200px]">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">{text}</p>
            </div>
        </div>
    );
}
