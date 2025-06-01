// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"; // Jika menggunakan toast ShadcnUI
import { cn } from "@/lib/utils"; // Impor cn

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans", // Untuk integrasi font dengan Tailwind
});

export const metadata: Metadata = {
  title: "Dasbor Ketenagakerjaan Pasifik", // Sesuaikan
  description: "Visualisasi data ketenagakerjaan di negara-negara dan wilayah Kepulauan Pasifik.", // Sesuaikan
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning> {/* suppressHydrationWarning jika menggunakan theme provider */}
      <body 
        className={cn(
          "min-h-screen bg-background font-sans antialiased", // "bg-background" dari tema Shadcn
          inter.variable
        )}
      >
        {/* Anda bisa menambahkan Navbar/Header di sini jika perlu */}
        <main className="flex-grow"> {/* Pastikan children mengisi ruang */}
          {children}
        </main>
        <Toaster />
        {/* Anda bisa menambahkan Footer global di sini jika tidak per halaman */}
      </body>
    </html>
  );
}