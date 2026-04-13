"use client";

import { motion } from "framer-motion";

export default function Contact() {
    return (
        <section id="contact" className="py-24 px-6 max-w-4xl mx-auto text-center">

            {/* Heading */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
            >
                <h2 className="text-3xl md:text-4xl font-semibold">
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
                    className="px-6 py-3 rounded-full bg-white text-black font-medium hover:scale-105 transition"
                >
                    Email Me
                </a>

                {/* GitHub */}
                <a
                    href="https://github.com/AdityaH1305"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full border border-slate-600 hover:bg-white hover:text-black transition"
                >
                    GitHub
                </a>

                {/* LinkedIn */}
                <a
                    href="https://www.linkedin.com/in/aditya-harikrishnan-3932192a4/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full border border-slate-600 hover:bg-white hover:text-black transition"
                >
                    LinkedIn
                </a>

            </motion.div>

            {/* Footer */}
            <div className="mt-16 text-sm text-slate-500">
                © {new Date().getFullYear()} Aditya Harikrishnan. All rights reserved.
            </div>

        </section>
    );
}