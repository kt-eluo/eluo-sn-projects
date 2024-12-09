'use client'

import { useRouter } from 'next/navigation'
import { useFirebase } from '@/context/FirebaseContext'
import { signOut } from 'firebase/auth'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/app/hooks/useAuth'
import { useState, useEffect } from 'react'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import Image from 'next/image'
import LogoBlack from '@/app/images/logo_line_bk.png'
import LogoWhite from '@/app/images/logo_line_wh.png'

export function Header() {
  const router = useRouter()
  const { auth } = useFirebase()
  const { darkMode, toggleTheme } = useTheme()
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return
      
      try {
        const db = getFirestore()
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin')
      } catch (error) {
        console.error('Admin check error:', error)
        setIsAdmin(false)
      }
    }

    checkAdminStatus()
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-8xl mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-0">
        <div className="flex justify-between items-center h-16 w-full">
          {/* 로고 영역 */}
          <div className="flex-shrink-0 cursor-pointer">
            <Image
              src={darkMode ? LogoWhite : LogoBlack}
              alt="Company Logo"
              width={120}
              height={40}
              priority
              className="transition-opacity duration-500"
            />
          </div>

          {/* 우측 버튼 영역 */}
          <div className="flex items-center justify-end space-x-4 flex-1">
            {/* 다크모드 토글 버튼 */}
            <button
              onClick={toggleTheme}
              className="fixed bottom-8 right-8 
                px-3 sm:px-4 py-1.5 sm:py-2 rounded-full
                transition-all duration-500 ease-in-out
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
                  <span className="mr-1 sm:mr-2">☀️</span>
                  <span className="hidden md:inline">라이트 모드</span>
                </>
              ) : (
                <>
                  <span className="mr-1 sm:mr-2">🌑</span>
                  <span className="hidden md:inline">다크 모드</span>
                </>
              )}
            </button>

            {/* 로그인/로그아웃 영역 */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
                <span className="text-gray-900 dark:text-white text-xs sm:text-sm md:text-base">
                  {user.email}
                  {isAdmin && (
                    <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs bg-gray-700 text-white rounded-full">
                      관리자
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-3 md:px-4 py-1 rounded-lg 
                    bg-red-500 hover:bg-red-600 
                    text-white text-xs sm:text-sm
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
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg 
                  bg-blue-500 hover:bg-blue-600 
                  text-white text-sm
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