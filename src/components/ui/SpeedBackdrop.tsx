"use client"

import React from 'react'

export default function SpeedBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 opacity-10 [mask-image:radial-gradient(transparent,black)]">
        <div className="w-[200%] h-[200%] -left-1/2 -top-1/2 absolute animate-[flow_30s_linear_infinite] bg-[length:40px_2px] bg-repeat bg-gradient-to-r from-transparent via-white to-transparent" style={{backgroundImage:'repeating-linear-gradient( 75deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 40px )'}} />
      </div>
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-[flow_30s_linear_infinite] { animation: none; }
        }
        @keyframes flow {
          0% { transform: translate3d(0,0,0) rotate(0deg); }
          100% { transform: translate3d(25%,25%,0) rotate(0deg); }
        }
      `}</style>
    </div>
  )
}

