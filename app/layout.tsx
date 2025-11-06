import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/print.css";
import { Providers } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";
import { NotificationProvider } from "@/components/notifications/notification-system";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Inventory - Inventory Management System",
  description: "Sistem manajemen stok barang dengan fitur lengkap",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <NotificationProvider>
              {children}
              <Toaster />
            </NotificationProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
