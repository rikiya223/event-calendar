import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { Fab } from "@/components/Fab";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "イベントカレンダー",
    template: "%s｜イベントカレンダー",
  },
  description: "世界中のイベントをカレンダーで発見できるサービス",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const admin = isAdminEmail(user?.email);

  return (
    <html lang="ja" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="min-h-full">
        <div className="mx-auto flex w-full max-w-7xl">
          <Sidebar email={user?.email} admin={admin} />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-20 lg:pb-0">
            <Header />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </div>
        <Fab />
        <BottomNav loggedIn={!!user} />
      </body>
    </html>
  );
}
