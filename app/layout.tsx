import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Run, Human, Run!",
  description: "A Pac-Man/Snake hybrid survival game - Run, Human, Run!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}