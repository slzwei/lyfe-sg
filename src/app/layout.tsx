import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Pacifico, Geist, Geist_Mono, PT_Mono, Noto_Sans_TC } from "next/font/google";
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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ptMono = PT_Mono({
  variable: "--font-pt-mono",
  weight: "400",
  subsets: ["latin"],
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  weight: ["400", "700"],
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
      className={`${plusJakarta.variable} ${pacifico.variable} ${geistSans.variable} ${geistMono.variable} ${ptMono.variable} ${notoSansTC.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
