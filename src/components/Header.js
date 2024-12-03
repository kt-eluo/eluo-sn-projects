'use client'

import { useRouter } from 'next/navigation'
import { useFirebase } from '@/context/FirebaseContext'
import { signOut } from 'firebase/auth'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/app/hooks/useAuth'
import Image from 'next/image'
import LogoBlack from '@/app/images/logo_line_bk.png'
import LogoWhite from '@/app/images/logo_line_wh.png'

export function Header() {
  const router = useRouter()
  const { auth } = useFirebase()
  const { darkMode, toggleTheme } = useTheme()
  const { user } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/')
      console.log('로그아웃 성공')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고/홈 버튼 */}
          <h1>
            <button
              onClick={() => router.push('/')}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Image
                src={darkMode ? LogoWhite : LogoBlack}
                alt="Company Logo"
                width={100}
                height={40}
                priority
                className="transition-opacity duration-500"
              />
            </button>
          </h1>

          <div className="flex items-center space-x-4">
            {/* 다크모드 토글 버튼 */}
            <button
              onClick={toggleTheme}
              className="fixed bottom-8 right-8 
                px-4 py-2 rounded-full
                transition-all duration-500 ease-in-out
                bg-gray-200 dark:bg-gray-700 
                text-gray-900 dark:text-white                 hover:bg-gray-300 dark:hover:bg-gray-600
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

            {/* 로그인/로그아웃 버튼 */}
            {user ? (
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
                    <span className="text-gray-900 dark:text-white text-sm sm:text-base hidden sm:inline">
                    {user.email}
                    </span>
                    <button
                    onClick={handleLogout}
                    className="px-2 sm:px-4 py-1 sm:py-2 rounded-lg 
                        bg-red-500 hover:bg-red-600 
                        text-white text-sm sm:text-base
                        transition-all duration-200 ease-in-out
                        transform hover:scale-105
                        whitespace-nowrap"
                    >
                    로그아웃
                    </button>
                </div>
                ) : (
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 rounded-lg 
                  bg-blue-500 hover:bg-blue-600 
                  text-white
                  transition-all duration-200 ease-in-out
                  transform hover:scale-105"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}