'use client'

import { useState, useEffect } from 'react'

const LAUNCH_END = new Date('2025-11-17T19:27:00').getTime() // 72 hours from launch (Nov 14, 2025 2:27 PM EST)

export default function LaunchTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [isLaunched, setIsLaunched] = useState(true)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now()
      const difference = LAUNCH_END - now

      if (difference <= 0) {
        setIsLaunched(false)
        return
      }

      setIsLaunched(true)
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      })
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!isLaunched) return null

  return (
    <div className="bg-black border-b border-gray-900 py-4 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <div>
            <div className="font-light text-sm text-white">🔥 Launch Special</div>
            <div className="text-xs text-gray-500">$2.99 flat rate (normally $4.99+)</div>
          </div>
        </div>
        
        <div className="flex gap-4 font-mono text-base">
          <div className="flex flex-col items-center min-w-[3rem]">
            <div className="text-2xl font-light text-white">{timeLeft.days}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wider">Days</div>
          </div>
          <div className="text-xl text-gray-800 self-start mt-1">:</div>
          <div className="flex flex-col items-center min-w-[3rem]">
            <div className="text-2xl font-light text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wider">Hrs</div>
          </div>
          <div className="text-xl text-gray-800 self-start mt-1">:</div>
          <div className="flex flex-col items-center min-w-[3rem]">
            <div className="text-2xl font-light text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wider">Min</div>
          </div>
          <div className="text-xl text-gray-800 self-start mt-1">:</div>
          <div className="flex flex-col items-center min-w-[3rem]">
            <div className="text-2xl font-light text-white">{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="text-xs text-gray-600 uppercase tracking-wider">Sec</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function isLaunchWeek(): boolean {
  return Date.now() < LAUNCH_END
}

export function getLaunchDiscount(price: number): number {
  // Launch special uses flat $2.99 pricing (handled in API)
  // This function kept for compatibility
  return price
}
