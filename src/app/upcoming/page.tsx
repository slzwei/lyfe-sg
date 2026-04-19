import type { Metadata } from "next";
import DaddyBaoPage from "@/components/daddy-bao/DaddyBaoPage";
import "../daddy-bao.css";

export const metadata: Metadata = {
  title: "Lyfe | Insurance Careers Singapore",
  description:
    "Join Lyfe, a team of trusted financial representatives in Singapore. We offer mentorship, training, and a clear career path in insurance and financial advisory.",
};

export default function UpcomingPage() {
  return <DaddyBaoPage />;
}
