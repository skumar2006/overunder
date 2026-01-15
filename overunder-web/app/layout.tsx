import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PrivyProviders } from "@/contexts/PrivyProvider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OverUnder - Localized Prediction Markets",
  description: "Join communities and create prediction markets with your friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <PrivyProviders>
          {children}
          <Toaster />
        </PrivyProviders>
      </body>
    </html>
  );
}
