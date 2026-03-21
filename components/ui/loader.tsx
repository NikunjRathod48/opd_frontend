import React from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "../layout/sidebar-provider";

interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  fullScreen?: boolean;
}

export function Loader({
  size = "md",
  text = "Loading",
  fullScreen = false,
  className,
  ...props
}: LoaderProps) {
  /* Sidebar awareness for fullscreen centering */
  let isCollapsed = false;
  try {
    const sidebar = useSidebar();
    isCollapsed = sidebar.isCollapsed;
  } catch (_) {}

  const sizeMap = {
    sm: { spinner: "h-5 w-5 border-2", text: "text-xs" },
    md: { spinner: "h-9 w-9 border-2", text: "text-sm" },
    lg: { spinner: "h-14 w-14 border-[3px]", text: "text-base" },
    xl: { spinner: "h-20 w-20 border-4", text: "text-lg" },
  };

  const { spinner, text: textSize } = sizeMap[size];

  const content = (
    <div
      className={cn("flex flex-col items-center justify-center gap-4", className)}
      {...props}
    >
      {/* Spinner */}
      <div
        className={cn(
          "rounded-full border-primary/20 border-t-primary animate-spin",
          spinner
        )}
        style={{ animationDuration: "0.75s" }}
      />

      {/* Label */}
      {text && (
        <p
          className={cn(
            "text-muted-foreground font-medium tracking-wide animate-pulse",
            textSize
          )}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[9999] flex items-center justify-center bg-background/75 backdrop-blur-sm",
          isCollapsed ? "md:pl-28" : "md:pl-80",
          "pl-0"
        )}
      >
        {content}
      </div>
    );
  }

  return content;
}
