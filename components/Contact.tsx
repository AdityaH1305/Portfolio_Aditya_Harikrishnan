"use client";

import { motion } from "framer-motion";

export default function Contact() {
    return (
        <section id="contact" className="py-24 px-6 max-w-4xl mx-auto text-center border-t border-[#141418]">

            {/* Heading */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
            >
                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Get In Touch
                </h2>
                <p className="text-slate-400 mt-3">
                    Feel free to reach out for opportunities, collaborations, or just a conversation.
                </p>
            </motion.div>

            {/* Contact Links */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="mt-10 flex flex-col md:flex-row justify-center gap-4"
            >

                {/* Email */}
                <a
                    href="mailto:adityaharikrishnan@gmail.com"
                    className="px-6 py-3 rounded-full bg-white text-black font-medium hover:scale-[1.03] transition-all duration-200"
                >
                    Email Me
                </a>

                {/* GitHub */}
                <a
                    href="https://github.com/AdityaH1305"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full border border-[#1e1e22] hover:border-sky-500/30 hover:text-sky-300 transition-all duration-200"
                >
                    GitHub
                </a>

                {/* LinkedIn */}
                <a
                    href="https://www.linkedin.com/in/aditya-harikrishnan-3932192a4/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full border border-[#1e1e22] hover:border-sky-500/30 hover:text-sky-300 transition-all duration-200"
                >
                    LinkedIn
                </a>

            </motion.div>

            <footer className="mt-20 pt-8 border-t border-[#141418] space-y-4">
                {/* Metadata micro-details */}
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Status: Available</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Focus: ML Systems</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Updated: 2026</span>
                </div>

                {/* Tech + copyright */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Built with Next.js + TypeScript</span>
                </div>
                <p className="text-sm text-slate-500">
                    © {new Date().getFullYear()} Aditya Harikrishnan
                </p>
            </footer>

        </section>
    );
}