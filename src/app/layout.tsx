import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Pacifico } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lyfe — We're Revamping",
  description:
    "Lyfe is getting a fresh new look. Stay tuned — we'll be back soon with something better.",
  keywords: [
    "insurance singapore",
    "financial adviser singapore",
    "life insurance",
    "health insurance",
    "financial planning singapore",
  ],
  openGraph: {
    title: "Lyfe — We're Revamping",
    description:
      "Lyfe is getting a fresh new look. Stay tuned — we'll be back soon with something better.",
    url: "https://lyfe.sg",
    siteName: "Lyfe",
    locale: "en_SG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${pacifico.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
