"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import WhyJoin from "@/components/WhyJoin";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { submitContactForm } from "./actions";

export default function DemoHomepage() {
  return (
    <main className="font-sans">
      <Navbar />
      <Hero />
      <About />
      <Services />
      <WhyJoin />
      <Contact action={submitContactForm} />
      <Footer />
    </main>
  );
}
