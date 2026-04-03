import type { Metadata } from "next";
import DemoHomepage from "./DemoHomepage";

export const metadata: Metadata = {
  title: "Lyfe — Financial Guidance for Every Stage of Life",
  description:
    "Trusted financial representatives in Singapore. Get personalised advice on life insurance, health insurance, savings, investments, and retirement planning.",
  keywords: [
    "insurance singapore",
    "financial adviser singapore",
    "life insurance",
    "health insurance",
    "financial planning singapore",
    "lyfe",
  ],
  openGraph: {
    title: "Lyfe — Financial Guidance for Every Stage of Life",
    description:
      "Trusted financial representatives in Singapore helping individuals and families make informed financial decisions.",
    url: "https://lyfe.sg",
    siteName: "Lyfe",
    locale: "en_SG",
    type: "website",
  },
};

export default function DemoPage() {
  return <DemoHomepage />;
}
