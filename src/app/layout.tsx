import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Pacifico } from "next/font/google";
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
  title: "Lyfe — Financial Representatives | Income Insurance Singapore",
  description:
    "Lyfe is a team of Income Insurance financial representatives in Singapore. We help with life insurance, health insurance, savings, investments, and retirement planning.",
  keywords: [
    "insurance singapore",
    "financial adviser singapore",
    "income insurance",
    "life insurance",
    "health insurance",
    "financial planning singapore",
    "NTUC Income",
  ],
  openGraph: {
    title: "Lyfe — Financial Representatives | Income Insurance Singapore",
    description:
      "Your financial future, made simple. We're a team of dedicated financial representatives under Income Insurance.",
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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
