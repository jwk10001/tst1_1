import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diary History",
  description: "A local-first diary with Git-like history",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
