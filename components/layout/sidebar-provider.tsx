"use client";

import * as React from "react";

interface SidebarContextType {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const isMobileRef = React.useRef(false);

    React.useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            // If we just switched to mobile, auto-collapse
            if (isMobile && !isMobileRef.current) {
                setIsCollapsed(true);
            }
            isMobileRef.current = isMobile;
        };

        // Initial check
        if (typeof window !== "undefined") {
            isMobileRef.current = window.innerWidth < 768;
            if (isMobileRef.current) {
                setIsCollapsed(true);
            }
            window.addEventListener("resize", handleResize);
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("resize", handleResize);
            }
        };
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed((prev) => !prev);
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = React.useContext(SidebarContext);
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}
