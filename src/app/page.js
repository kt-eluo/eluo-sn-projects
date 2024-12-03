'use client'

import { Auth } from '@/app/components/Auth'
import { useTheme } from '@/context/ThemeContext'
import { DarkModeToggle } from '@/components/DarkModeToggle'

export default function LoginPage() {
  return (
    <div className="relative">
      <Auth />
      <DarkModeToggle />
    </div>
  )
} 