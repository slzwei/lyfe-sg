"use client";

import { useInView } from "@/hooks/useInView";
import type { ReactNode, CSSProperties } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section";
}

export default function AnimateIn({ children, delay = 0, className = "", as: Tag = "div" }: Props) {
  const { ref, isInView } = useInView();

  const style: CSSProperties = {
    opacity: isInView ? 1 : 0,
    transform: isInView ? "translateY(0)" : "translateY(28px)",
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  };

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
