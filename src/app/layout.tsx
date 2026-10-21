import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "SecureDoc AI",
  description: "Sikker AI-dokumentanalyse med automatisk anonymisering",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased bg-[#F3E9DD] text-[#3D2C20]">{children}</body>
    </html>
  );
}