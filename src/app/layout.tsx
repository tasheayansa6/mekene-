import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { PublicShell } from "@/components/layout/PublicShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { churchConfig } from "@/config/church";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${churchConfig.branding.name}`,
    template: `%s | ${churchConfig.branding.name}`,
  },
  description: churchConfig.branding.description,
  keywords: [
    "Ethiopian Evangelical",
    "Mekane Yesus",
    "Church",
    "Addis Ababa",
    "Worship",
    "Prayer",
    "Community",
    "Busa Mekene Eyasus",
  ],
  authors: [{ name: churchConfig.branding.name }],
  icons: {
    icon: churchConfig.branding.favicon,
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: churchConfig.branding.name,
    description: churchConfig.branding.description,
    siteName: churchConfig.branding.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <PublicShell>{children}</PublicShell>
              <ServiceWorkerRegister />
              <Toaster />
              <SonnerToaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}