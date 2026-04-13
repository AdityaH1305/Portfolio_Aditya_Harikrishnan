import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import WhatIBuild from "@/components/WhatIBuild";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <main className="bg-black text-white min-h-screen">
      <Navbar />
      <Hero />
      <About />
      <WhatIBuild />
      <Projects />
      <Contact />
    </main>
  );
}