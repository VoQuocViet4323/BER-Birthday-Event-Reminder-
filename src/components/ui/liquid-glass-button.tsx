"use client";

// Lucian UX/UI Prompt #001 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#001

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface LiquidGlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSubmitting?: boolean;
  idleText?: string;
  loadingText?: string;
  successText?: string;
  btnWidth?: string;
  btnHeight?: string;
  className?: string;
  onSuccessDone?: () => void;
}

export function LiquidGlassButton({
  isSubmitting = false,
  idleText = "Lưu sự kiện",
  loadingText = "Đang lưu...",
  successText = "Đã lưu!",
  btnWidth = "100%",
  btnHeight = "48px",
  className,
  type = "submit",
  disabled,
  onClick,
  onSuccessDone,
  ...props
}: LiquidGlassButtonProps) {
  const [internalState, setInternalState] = useState<"idle" | "load" | "ok">("idle");
  const prevSubmittingRef = useRef(isSubmitting);
  const rootRef = useRef<HTMLDivElement>(null);
  const magRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Đồng bộ trạng thái submitting từ Form & TanStack Query
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSubmitting) {
      setInternalState("load");
    } else if (prevSubmittingRef.current && !isSubmitting) {
      setInternalState("ok");
      timer = setTimeout(() => {
        setInternalState("idle");
        onSuccessDone?.();
      }, 1500);
    }
    prevSubmittingRef.current = isSubmitting;
    return () => clearTimeout(timer);
  }, [isSubmitting, onSuccessDone]);

  // Hiệu ứng lực từ tính (Magnetic Pull) theo con trỏ chuột
  useEffect(() => {
    const root = rootRef.current;
    const btn = btnRef.current;
    const mag = magRef.current;
    if (!root || !btn || !mag) return;

    const rm =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handlePointerMove = (e: PointerEvent) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const pull = rm ? 0 : Math.max(0, 1 - Math.hypot(dx, dy) / 190);
      mag.style.translate = `${(dx * 0.18 * pull).toFixed(1)}px ${(dy * 0.18 * pull).toFixed(1)}px`;
      btn.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      btn.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    };

    const handlePointerLeave = () => {
      mag.style.translate = "0px 0px";
    };

    root.addEventListener("pointermove", handlePointerMove);
    root.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      root.removeEventListener("pointermove", handlePointerMove);
      root.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (internalState === "load") {
      e.preventDefault();
      return;
    }
    if (onClick) onClick(e);
  };

  return (
    <div
      ref={rootRef}
      className={cn("ux u001", className)}
      data-state={internalState}
      style={
        {
          "--btn-w": btnWidth,
          "--btn-h": btnHeight,
        } as React.CSSProperties
      }
    >
      <style jsx>{`
        .u001 {
          --ux-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
          --ux-spring: cubic-bezier(0.34, 1.45, 0.64, 1);
          --ux-mint: #119c72;
          --ux-ink: hsl(var(--foreground));
          --ux-accent: hsl(var(--primary));
          --g1: rgba(255, 255, 255, 0.7);
          --g2: rgba(255, 255, 255, 0.2);
          --g3: rgba(255, 255, 255, 0.45);
          --hi: rgba(255, 255, 255, 0.95);
          --rim: rgba(255, 255, 255, 0.7);
          --drop: rgba(70, 48, 160, 0.28);
          --blob: 0.55;

          position: relative;
          width: var(--btn-w, 100%);
          height: var(--btn-h, 48px);
          display: flex;
          align-items: center;
          justify-content: center;
          isolation: isolate;
        }

        :global(.dark) .u001 {
          --ux-mint: #7ee8c0;
          --ux-ink: hsl(var(--foreground));
          --g1: rgba(255, 255, 255, 0.18);
          --g2: rgba(255, 255, 255, 0.04);
          --g3: rgba(255, 255, 255, 0.12);
          --hi: rgba(255, 255, 255, 0.5);
          --rim: rgba(255, 255, 255, 0.22);
          --drop: rgba(0, 0, 0, 0.6);
          --blob: 0.55;
        }

        .u001-blobs {
          position: absolute;
          inset: -4px -8px;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
          border-radius: 999px;
        }

        .u001-blobs i {
          position: absolute;
          border-radius: 50%;
          filter: blur(18px);
          opacity: var(--blob);
          animation: u001-drift 12s ease-in-out infinite alternate;
        }

        .u001-blobs i:nth-child(1) {
          left: 10%;
          top: 15%;
          width: 80px;
          height: 50px;
          background: #8b6cff;
        }

        .u001-blobs i:nth-child(2) {
          right: 10%;
          bottom: 15%;
          width: 80px;
          height: 50px;
          background: #33b6ff;
          animation-delay: -4s;
        }

        .u001-blobs i:nth-child(3) {
          left: 45%;
          top: 10%;
          width: 60px;
          height: 45px;
          background: #3be0b0;
          opacity: calc(var(--blob) * 0.7);
          animation-delay: -8s;
        }

        @keyframes u001-drift {
          from {
            transform: translate3d(-6px, -4px, 0) scale(1);
          }
          to {
            transform: translate3d(8px, 5px, 0) scale(1.12);
          }
        }

        .u001-mag {
          transition: translate 0.8s var(--ux-spring);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .u001-float {
          animation: u001-float 6s ease-in-out infinite;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes u001-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .u001-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--btn-w, 100%);
          max-width: 100%;
          height: var(--btn-h, 48px);
          padding: 0 20px;
          border: 0;
          border-radius: 999px;
          overflow: hidden;
          isolation: isolate;
          color: var(--ux-ink);
          background: linear-gradient(150deg, var(--g1), var(--g2) 55%, var(--g3));
          -webkit-backdrop-filter: blur(18px) saturate(180%);
          backdrop-filter: blur(18px) saturate(180%);
          box-shadow:
            inset 0 1.5px 0 var(--hi),
            inset 0 -12px 20px -14px var(--hi),
            inset 0 0 0 1px var(--rim),
            0 16px 32px -16px var(--drop),
            0 3px 8px -4px var(--drop);
          transition:
            width 0.7s var(--ux-ease),
            transform 0.55s var(--ux-spring),
            box-shadow 0.6s var(--ux-ease);
          cursor: pointer;
          user-select: none;
        }

        .u001-btn::before {
          content: "";
          position: absolute;
          left: 9%;
          right: 9%;
          top: 7%;
          height: 42%;
          border-radius: 999px;
          pointer-events: none;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.42),
            rgba(255, 255, 255, 0)
          );
        }

        .u001-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.4s var(--ux-ease);
          background: radial-gradient(
            130px 70px at var(--mx, 50%) var(--my, 0%),
            rgba(255, 255, 255, 0.4),
            transparent 70%
          );
        }

        .u001-btn:hover::after {
          opacity: 1;
        }

        .u001-btn:active {
          transform: scale(1.02, 0.94);
        }

        .u001-btn:focus-visible {
          outline: 2px solid var(--ux-accent);
          outline-offset: 4px;
        }

        .u001-sheen {
          position: absolute;
          top: -40%;
          bottom: -40%;
          left: 0;
          width: 38%;
          pointer-events: none;
          background: linear-gradient(
            100deg,
            transparent,
            rgba(255, 255, 255, 0.45) 50%,
            transparent
          );
          transform: translateX(-150%) skewX(-12deg);
          transition: transform 1.1s var(--ux-ease);
        }

        .u001-btn:hover .u001-sheen {
          transform: translateX(300%) skewX(-12deg);
        }

        .u001-txt,
        .u001-done {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.015em;
          white-space: nowrap;
          transition:
            opacity 0.35s var(--ux-ease),
            transform 0.55s var(--ux-ease),
            filter 0.4s var(--ux-ease);
        }

        .u001-done {
          opacity: 0;
          transform: translateY(14px);
          filter: blur(4px);
        }

        .u001-done b {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--ux-mint);
          color: #fff;
          box-shadow: 0 0 0 5px color-mix(in srgb, var(--ux-mint) 22%, transparent);
        }

        .u001-done svg {
          width: 14px;
          height: 14px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .u001-done path {
          stroke-dasharray: 18;
          stroke-dashoffset: 18;
          transition: stroke-dashoffset 0.5s var(--ux-ease) 0.3s;
        }

        .u001-spin {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 24px;
          height: 24px;
          margin: -12px 0 0 -12px;
          opacity: 0;
          transform: scale(0.5);
          transition:
            opacity 0.35s var(--ux-ease),
            transform 0.6s var(--ux-spring);
        }

        .u001-spin svg {
          width: 100%;
          height: 100%;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.4;
          stroke-linecap: round;
          animation: u001-rot 1s linear infinite;
        }

        .u001-spin circle {
          stroke-dasharray: 1 56;
          animation: u001-arc 1.4s ease-in-out infinite;
        }

        @keyframes u001-rot {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes u001-arc {
          0%,
          100% {
            stroke-dasharray: 1 56;
          }
          50% {
            stroke-dasharray: 38 19;
          }
        }

        /* Co thắt như giọt nước khi loading */
        .u001[data-state="load"] .u001-btn {
          width: var(--btn-h, 48px) !important;
          padding: 0;
          cursor: progress;
        }

        .u001[data-state="load"] .u001-txt {
          opacity: 0;
          transform: translateY(-14px);
          filter: blur(5px);
        }

        .u001[data-state="load"] .u001-spin {
          opacity: 1;
          transform: none;
        }

        /* Bật mở lại viên nang kèm dấu tích checkmark khi thành công */
        .u001[data-state="ok"] .u001-btn {
          transition-timing-function: var(--ux-spring);
          box-shadow:
            inset 0 1.5px 0 var(--hi),
            inset 0 0 0 1px var(--rim),
            0 16px 32px -16px var(--drop),
            0 0 36px -6px color-mix(in srgb, var(--ux-mint) 70%, transparent);
        }

        .u001[data-state="ok"] .u001-txt {
          opacity: 0;
          transform: translateY(-14px);
          filter: blur(5px);
        }

        .u001[data-state="ok"] .u001-done {
          opacity: 1;
          transform: none;
          filter: none;
        }

        .u001[data-state="ok"] .u001-done path {
          stroke-dashoffset: 0;
        }

        .u001-live {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
        }

        @media (prefers-reduced-motion: reduce) {
          .u001,
          .u001 *,
          .u001 *::before,
          .u001 *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      <div className="u001-blobs" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <div className="u001-mag" ref={magRef}>
        <div className="u001-float">
          <button
            ref={btnRef}
            className="u001-btn"
            type={type}
            disabled={disabled || internalState === "load"}
            aria-busy={internalState === "load"}
            onClick={handleClick}
            {...props}
          >
            <span className="u001-sheen" aria-hidden="true" />
            <span className="u001-txt">{idleText}</span>
            <span className="u001-spin" aria-hidden="true">
              <svg viewBox="0 0 30 30">
                <circle cx="15" cy="15" r="10" />
              </svg>
            </span>
            <span className="u001-done" aria-hidden="true">
              <b>
                <svg viewBox="0 0 16 16">
                  <path d="M3.5 8.4l3 3 6-6.4" />
                </svg>
              </b>
              {successText}
            </span>
          </button>
        </div>
      </div>

      <span className="u001-live" aria-live="polite">
        {internalState === "load" ? loadingText : internalState === "ok" ? successText : ""}
      </span>
    </div>
  );
}
