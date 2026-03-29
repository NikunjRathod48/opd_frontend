import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/context/auth-context";
import { DataProvider } from "@/context/data-context";
import { SocketProvider } from "@/context/socket-context";
import NextTopLoader from "nextjs-toploader";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MedCore HMS",
  description: "Hospital Management System Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontSans.className}>
        <NextTopLoader color="#4F46E5" showSpinner={false} height={3} zIndex={9999} shadow="0 0 10px #4F46E5,0 0 5px #4F46E5" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <DataProvider>
              <ToastProvider>
                <SocketProvider>
                      {children}
                </SocketProvider>
              </ToastProvider>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
