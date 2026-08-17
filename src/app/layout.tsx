import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PublicShell } from "@/components/layout/PublicShell";
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
    "Busa Mekenene Eyasus",
  ],
  authors: [{ name: churchConfig.branding.name }],
  icons: {
    icon: churchConfig.branding.favicon,
  },
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
            <PublicShell>{children}</PublicShell>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}