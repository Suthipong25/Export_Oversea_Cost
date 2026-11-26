import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sarabun } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Perkin Logistics (Thailand) Co., Ltd.",
  description: "ระบบสืบค้นและเปรียบเทียบราคาค่าระวางเรือส่งออก 18 สายเรือ & Local Charges ในไทย",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${plusJakartaSans.variable} ${sarabun.variable}`}>
      <body className="min-h-screen bg-[#F8FAFC] antialiased text-slate-800">
        {children}
      </body>
    </html>
  );
}
