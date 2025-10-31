'use client'

import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  startTime: number
}

interface XFireworksLoaderProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function XFireworksLoader({ message, size = 'md' }: XFireworksLoaderProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  
  const sizeConfig = {
    sm: { width: 200, height: 200, fontSize: 12, particleCount: 30 },
    md: { width: 300, height: 300, fontSize: 16, particleCount: 50 },
    lg: { width: 400, height: 400, fontSize: 20, particleCount: 80 }
  }
  
  const config = sizeConfig[size]

  useEffect(() => {
    let animationFrame: number
    let particleId = 0

    const createFirework = () => {
      const centerX = config.width / 2
      const centerY = config.height / 2
      const now = Date.now()
      
      const newParticles: Particle[] = []
      
      // Create particles in a burst pattern
      for (let i = 0; i < config.particleCount; i++) {
        const angle = (Math.PI * 2 * i) / config.particleCount
        const speed = 2 + Math.random() * 3
        const vx = Math.cos(angle) * speed
        const vy = Math.sin(angle) * speed
        
        newParticles.push({
          id: particleId++,
          x: centerX,
          y: centerY,
          vx,
          vy,
          life: 1,
          startTime: now
        })
      }
      
      setParticles(prev => [...prev, ...newParticles])
    }

    const animate = () => {
      const now = Date.now()
      
      setParticles(prev => {
        return prev
          .map(p => {
            const age = (now - p.startTime) / 1000 // age in seconds
            const life = Math.max(0, 1 - age / 1.5) // fade over 1.5 seconds
            
            return {
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              life
            }
          })
          .filter(p => p.life > 0)
      })
      
      animationFrame = requestAnimationFrame(animate)
    }

    // Create fireworks at intervals
    const fireworkInterval = setInterval(createFirework, 400)
    
    // Start animation
    animationFrame = requestAnimationFrame(animate)
    
    // Initial burst
    createFirework()

    return () => {
      clearInterval(fireworkInterval)
      cancelAnimationFrame(animationFrame)
    }
  }, [config.width, config.height, config.particleCount])

  return (
    <div className="flex flex-col items-center justify-center">
      <div 
        className="relative"
        style={{ 
          width: config.width, 
          height: config.height 
        }}
      >
        {particles.map(particle => (
          <span
            key={particle.id}
            className="absolute font-bold text-blue-400 pointer-events-none"
            style={{
              left: particle.x,
              top: particle.y,
              fontSize: config.fontSize,
              opacity: particle.life,
              transform: `translate(-50%, -50%) scale(${particle.life})`,
              textShadow: `0 0 ${particle.life * 10}px rgba(59, 130, 246, ${particle.life})`
            }}
          >
            𝕏
          </span>
        ))}
        
        {/* Center glow effect */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-blue-500/20 blur-xl animate-pulse"
        />
      </div>
      
      {message && (
        <div className="mt-4 text-gray-400 text-sm animate-pulse">
          {message}
        </div>
      )}
    </div>
  )
}
