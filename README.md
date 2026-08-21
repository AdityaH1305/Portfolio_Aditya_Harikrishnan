# Aditya Harikrishnan — Portfolio

A modern, interactive developer portfolio built with Next.js, showcasing work in machine learning, full-stack development, and systems design.

**Live site:** https://adityaharikrishnan.vercel.app

---

## Features

- A generative canvas "system atlas" that grows a new stage per section as you scroll
- Command palette (`Ctrl`/`Cmd` + `K`)
- Interactive project showcases with click-to-enlarge previews
- Walkthrough videos that load only once scrolled into view
- A hidden easter egg
- Fully responsive and `prefers-reduced-motion` aware throughout

---

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS v4 — design tokens live in `app/globals.css`, with no separate config file
- **Type:** Inter, with JetBrains Mono for code and data
- **Animation:** GSAP and Lenis, alongside a hand-rolled canvas engine for the generative visuals
- **Deployment:** Vercel

---

## Projects

### Ludex
A hybrid recommendation engine for Steam games, combining content-based and collaborative filtering.

- +27% Precision@20 over the content-based baseline
- +13% over collaborative filtering alone
- Trained and evaluated across 57,000+ titles and 1,200+ players
- Full technical report published on the site

### PlayNexus
A full-stack platform for exploring Steam games.

- Multi-region price comparison
- Custom value-scoring algorithm
- Vibe-based game discovery
- Real-time Steam API integration

### SynthRescue
An AI-powered disaster analysis system built on computer vision.

- YOLO-based structural damage detection
- AI-generated emergency reports via Gemini
- Real-time image analysis pipeline
- Designed for fault-tolerant, rapid deployment

---

## About

This portfolio reflects a focus on:

- Machine learning systems
- Backend engineering
- Scalable application design

I enjoy building systems that bring together data, intelligence, and usability.
