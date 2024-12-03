'use client'

import { useTheme } from '@/context/ThemeContext'

export function DarkModeToggle() {
  const { darkMode, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-8 right-8 
        px-4 py-2 rounded-full
        transition-all duration-200 ease-in-out
        bg-gray-200 dark:bg-gray-700 
        text-gray-900 dark:text-white 
        hover:bg-gray-300 dark:hover:bg-gray-600
        shadow-lg hover:shadow-xl
        flex items-center justify-center
        transform hover:scale-105
        z-50"
    >
      {darkMode ? (
        <>
          <span className="mr-2">☀️</span>
          <span className="hidden md:inline">라이트 모드</span>
        </>
      ) : (
        <>
          <span className="mr-2">🌙</span>
          <span className="hidden md:inline">다크 모드</span>
        </>
      )}
    </button>
  )
} 