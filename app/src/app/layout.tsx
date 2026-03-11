import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "期限管理システム | A型事業所向け",
  description:
    "就労継続支援A型事業所向け 期限・進捗管理システム。受給者証・支援計画等の更新漏れを防止し、管理業務を効率化します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-background">
            {/* モバイルではヘッダー分のpadding-topを追加 */}
            <div className="p-4 pt-[calc(3.5rem+1rem)] md:p-6 md:pt-6 lg:p-8 lg:pt-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
