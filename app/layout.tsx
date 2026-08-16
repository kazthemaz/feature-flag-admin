import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import TopBar from "./components/TopBar";
import { RoleProvider } from "./components/RoleContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Feature Flag Admin",
  description: "Internal feature flag admin panel",
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
        <RoleProvider>
          <TopBar />
          {children}
        </RoleProvider>
      </body>
    </html>
  );
}
