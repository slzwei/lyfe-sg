import type { Metadata } from "next";
import DaddyBaoPage from "@/components/daddy-bao/DaddyBaoPage";
import "../daddy-bao.css";

export const metadata: Metadata = {
  title: "Daddy Bao | Taiwanese Restaurant Tooting",
  description:
    "Enjoy bold Taiwanese flavours at Daddy Bao, a family-run restaurant in Tooting, serving up fluffy bao, street food inspired dishes, weekly specials and cocktails.",
};

export default function UpcomingPage() {
  return <DaddyBaoPage />;
}
