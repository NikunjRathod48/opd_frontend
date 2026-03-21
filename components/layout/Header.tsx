"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { UserNav } from "@/components/layout/user-nav";

export function Header() {
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <header className="sticky top-4 z-40 flex h-16 shrink-0 items-center justify-between border border-white/20 dark:border-white/10 bg-background/70 backdrop-blur-xl px-6 shadow-sm transition-all duration-300 mx-6 rounded-full mb-6">
        <div className="flex items-center gap-4">
          {/* Mobile Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="flex md:hidden hover:bg-accent/50 hover:scale-105 transition-all duration-200">
            <Menu className="h-5 w-5" />
          </Button>

          {/* MedCore Logo - Now visible on Desktop too */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg">
              M
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground hidden md:block">
              MedCore
            </span>
            {/* Mobile text */}
            <span className="font-bold text-xl tracking-tight text-foreground md:hidden">
              MedCore
            </span>
          </div>
        </div>

        <div className="flex flex-1 justify-end items-center gap-4">
          <div className="transition-transform duration-200 hover:scale-105">
            <ModeToggle />
          </div>
          <div className="transition-transform duration-200 hover:scale-105">
            <UserNav />
          </div>
        </div>
      </header>
    </>
  );
}
