import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel — Lyfe",
  description: "Admin dashboard for the Lyfe platform",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
