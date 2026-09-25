import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marlow Dental — Dentistry without the dread",
  description:
    "A small, independent dental practice in Chicago's Lincoln Park. We run on time, explain everything before we start, and never upsell you on treatment you don't need.",
  metadataBase: new URL("https://marlowdental.com"),
  openGraph: {
    title: "Marlow Dental — Dentistry without the dread",
    description:
      "Independent dental practice in Lincoln Park. Same-week openings. Written estimates before treatment. One dentist, start to finish.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="grain bg-bone text-ink antialiased">{children}</body>
    </html>
  );
}