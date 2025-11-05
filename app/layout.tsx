import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import SessionProvider from "@/components/providers/next-auth-provider";
import { WebSocketProvider } from "@/components/providers/socket-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MG Chat",
  description: "This is a chat app by Magistrala",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider basePath={process.env.MG_NEXTAUTH_BASE_PATH}>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
            <Toaster />
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
