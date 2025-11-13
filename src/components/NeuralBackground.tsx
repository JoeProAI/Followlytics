"use client"

import React, { useEffect, useRef } from "react"

// Neural-network style animated background
// - Dark backdrop with soft blue/purple lines and nodes
// - Low opacity so it doesn't fight with foreground UI
// - Pointer events disabled so everything remains clickable

const NODE_COUNT = 70
const CONNECTION_DISTANCE = 180

interface Node {
  x: number
  y: number
  vx: number
  vy: number
}

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let nodes: Node[] = []

    const resize = () => {
      const { innerWidth, innerHeight } = window
      canvas.width = innerWidth
      canvas.height = innerHeight
    }

    const initNodes = () => {
      nodes = []
      const { innerWidth, innerHeight } = window
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * innerWidth,
          y: Math.random() * innerHeight,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
        })
      }
    }

    const step = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      // Draw connections
      ctx.lineWidth = 0.6
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DISTANCE) {
            const alpha = 1 - dist / CONNECTION_DISTANCE
            ctx.strokeStyle = `rgba(80, 180, 255, ${0.18 * alpha})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath()
        const radius = 1.2
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 6)
        gradient.addColorStop(0, "rgba(150, 220, 255, 0.9)")
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
        ctx.fillStyle = gradient
        ctx.arc(n.x, n.y, radius * 6, 0, Math.PI * 2)
        ctx.fill()
      }

      // Update positions
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy

        if (n.x < -50) n.x = width + 50
        if (n.x > width + 50) n.x = -50
        if (n.y < -50) n.y = height + 50
        if (n.y > height + 50) n.y = -50
      }

      animationFrameId = window.requestAnimationFrame(step)
    }

    resize()
    initNodes()
    animationFrameId = window.requestAnimationFrame(step)

    window.addEventListener("resize", resize)

    return () => {
      window.removeEventListener("resize", resize)
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_top,_#020817_0,_#020617_40%,_#020617_100%)]"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-[0.55] mix-blend-screen"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.12)_0,_transparent_55%)]" />
    </div>
  )
}
