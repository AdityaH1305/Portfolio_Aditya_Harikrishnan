"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lockScroll, unlockScroll } from "@/lib/lenis";

/* ══════════════════════════════════════════════════════
   VideoPlayer — expanded playback for the Ludex walkthroughs

   Deliberately minimal: play/pause, ±10s, and a scrubbable
   progress bar. No volume control, because both sources are
   video-only — the audio track was stripped during encoding,
   so a mute button would control nothing.

   Seeking is driven by pointer events rather than a range
   input so click-to-seek and drag-to-scrub share one code
   path, and the bar can be styled to match the site.
   ══════════════════════════════════════════════════════ */

const SKIP = 10;

function formatTime(s: number): string {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({
    src,
    poster,
    label,
    onClose,
}: {
    src: string;
    poster?: string;
    label: string;
    onClose: () => void;
}) {
    const shellRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const barRef = useRef<HTMLDivElement>(null);

    const [playing, setPlaying] = useState(true);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [shown, setShown] = useState(false);
    const [scrubbing, setScrubbing] = useState(false);

    const togglePlay = useCallback(() => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) {
            v.play().catch(() => {});
        } else {
            v.pause();
        }
    }, []);

    const skip = useCallback((delta: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = Math.min(
            Math.max(0, v.currentTime + delta),
            v.duration || 0,
        );
    }, []);

    /** Map a pointer x-position on the bar to a time and seek there. */
    const seekTo = useCallback((clientX: number) => {
        const v = videoRef.current;
        const bar = barRef.current;
        if (!v || !bar || !v.duration) return;
        const rect = bar.getBoundingClientRect();
        const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        v.currentTime = ratio * v.duration;
        setTime(v.currentTime);
    }, []);

    const toggleFullscreen = useCallback(() => {
        const el = shellRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void el.requestFullscreen?.().catch(() => {});
        }
    }, []);

    /* Scroll lock + keyboard. Escape closes, but only when not in native
       fullscreen — there the browser's own Escape should exit that first. */
    useEffect(() => {
        lockScroll();
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    if (!document.fullscreenElement) onClose();
                    break;
                case " ":
                case "k":
                    e.preventDefault();
                    togglePlay();
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    skip(-SKIP);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    skip(SKIP);
                    break;
                case "f":
                    toggleFullscreen();
                    break;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            unlockScroll();
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose, togglePlay, skip, toggleFullscreen]);

    /* Drag-to-scrub continues outside the bar, so the listeners go on window. */
    useEffect(() => {
        if (!scrubbing) return;
        const move = (e: PointerEvent) => seekTo(e.clientX);
        const up = () => setScrubbing(false);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, [scrubbing, seekTo]);

    useEffect(() => {
        const id = requestAnimationFrame(() =>
            requestAnimationFrame(() => setShown(true)),
        );
        return () => cancelAnimationFrame(id);
    }, []);

    const progress = duration > 0 ? (time / duration) * 100 : 0;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`${label} — expanded player`}
            className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 backdrop-blur-md p-4 transition-opacity duration-[250ms] ${
                shown ? "opacity-100" : "opacity-0"
            }`}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                aria-label="Close player"
                className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center
                           text-white/60 hover:text-white text-2xl leading-none
                           transition-colors duration-200"
            >
                ×
            </button>

            <div
                ref={shellRef}
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-5xl bg-surface-0 rounded-xl overflow-hidden border border-edge-default transition-all duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    shown ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
            >
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                    ref={videoRef}
                    src={src}
                    poster={poster}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={togglePlay}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onTimeUpdate={(e) => {
                        if (!scrubbing) setTime(e.currentTarget.currentTime);
                    }}
                    onLoadedMetadata={(e) =>
                        setDuration(e.currentTarget.duration)
                    }
                    className="w-full h-auto max-h-[78vh] block bg-black cursor-pointer"
                />

                <div className="px-4 py-3 md:px-5 md:py-4 border-t border-edge">
                    {/* Seek bar — generous hit area, thin visual line */}
                    <div
                        ref={barRef}
                        role="slider"
                        tabIndex={0}
                        aria-label="Seek"
                        aria-valuemin={0}
                        aria-valuemax={Math.round(duration)}
                        aria-valuenow={Math.round(time)}
                        aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
                        onPointerDown={(e) => {
                            setScrubbing(true);
                            seekTo(e.clientX);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "ArrowLeft") skip(-SKIP);
                            if (e.key === "ArrowRight") skip(SKIP);
                        }}
                        className="group/bar relative h-4 flex items-center cursor-pointer"
                    >
                        <div className="h-1 w-full rounded-full bg-surface-3 overflow-hidden">
                            <div
                                className="h-full bg-accent rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span
                            aria-hidden="true"
                            className="absolute w-3 h-3 rounded-full bg-accent -translate-x-1/2
                                       opacity-0 group-hover/bar:opacity-100 transition-opacity duration-150"
                            style={{ left: `${progress}%` }}
                        />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={() => skip(-SKIP)}
                            aria-label={`Rewind ${SKIP} seconds`}
                            className="px-2.5 py-1.5 mono text-xs text-secondary hover:text-accent transition-colors duration-200"
                        >
                            ‹‹ {SKIP}s
                        </button>

                        <button
                            onClick={togglePlay}
                            aria-label={playing ? "Pause" : "Play"}
                            className="w-10 h-10 flex items-center justify-center rounded-full
                                       border border-edge-strong text-primary
                                       hover:border-accent hover:text-accent transition-colors duration-200"
                        >
                            {playing ? (
                                <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                                    <rect x="0" y="0" width="4" height="14" fill="currentColor" />
                                    <rect x="8" y="0" width="4" height="14" fill="currentColor" />
                                </svg>
                            ) : (
                                <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                                    <path d="M0 0 L12 7 L0 14 Z" fill="currentColor" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={() => skip(SKIP)}
                            aria-label={`Forward ${SKIP} seconds`}
                            className="px-2.5 py-1.5 mono text-xs text-secondary hover:text-accent transition-colors duration-200"
                        >
                            {SKIP}s ››
                        </button>

                        <span className="ml-3 mono text-xs text-tertiary tabular-nums">
                            {formatTime(time)} / {formatTime(duration)}
                        </span>

                        <span className="ml-auto label-muted hidden sm:inline">
                            {label}
                        </span>

                        <button
                            onClick={toggleFullscreen}
                            aria-label="Toggle fullscreen"
                            className="ml-3 w-9 h-9 flex items-center justify-center
                                       text-secondary hover:text-accent transition-colors duration-200"
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden="true"
                            >
                                <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
