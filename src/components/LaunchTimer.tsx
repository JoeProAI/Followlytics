'use client'

import { useState, useEffect } from 'react'

const LAUNCH_END = new Date('2025-11-17T23:59:59').getTime() // 7 days from now

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
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <div>
            <div className="font-bold text-lg">Launch Week Special</div>
            <div className="text-sm opacity-90">50% OFF All Exports</div>
          </div>
        </div>
        
        <div className="flex gap-4 font-mono text-lg">
          <div className="flex flex-col items-center">
            <div className="font-bold">{timeLeft.days}</div>
            <div className="text-xs opacity-75">DAYS</div>
          </div>
          <div className="text-2xl opacity-50">:</div>
          <div className="flex flex-col items-center">
            <div className="font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="text-xs opacity-75">HRS</div>
          </div>
          <div className="text-2xl opacity-50">:</div>
          <div className="flex flex-col items-center">
            <div className="font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="text-xs opacity-75">MIN</div>
          </div>
          <div className="text-2xl opacity-50">:</div>
          <div className="flex flex-col items-center">
            <div className="font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="text-xs opacity-75">SEC</div>
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
  if (!isLaunchWeek()) return price
  return Math.round(price * 0.5) // 50% off
}
