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
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchVisible, setIsSearchVisible] = useState(false)

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

  const handleSearch = (e) => {
    e.preventDefault()
    // 검색 로직 구현 예정
    console.log('Search term:', searchTerm)
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col">
        {/* 기존 헤더 영역 */}
        <div className="flex justify-between items-center h-16">
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
            {/* 검색 토글 버튼 */}
            {user && (
              <button
                onClick={() => setIsSearchVisible(!isSearchVisible)}
                className="w-8 h-8 flex items-center justify-center rounded-full
                  bg-gray-100 dark:bg-gray-700
                  text-gray-600 dark:text-gray-300
                  hover:bg-gray-200 dark:hover:bg-gray-600
                  transition-all duration-200"
              >
                🔍
              </button>
            )}

            {/* 다크모드 토글 버튼 */}
            <button
              onClick={toggleTheme}
              className="fixed bottom-8 right-8 
                px-4 py-2 rounded-full
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
                  <span className="mr-2">☀️</span>
                  <span className="hidden md:inline">라이트 모드</span>
                </>
              ) : (
                <>
                  <span className="mr-2">🌑</span>
                  <span className="hidden md:inline">다크 모드</span>
                </>
              )}
            </button>

            {/* 로그인/로그아웃 버튼 */}
            {user ? (
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
                <span className="text-gray-900 dark:text-white text-sm sm:text-base hidden sm:inline">
                  {user.email}
                  {isAdmin && (
                    <span className="ml-2 px-2 py-1 text-xs bg-gray-700 text-white rounded-full">
                      관리자
                    </span>
                  )}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-3 py-1 rounded-lg 
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

        {/* 검색바 영역 */}
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out
            ${isSearchVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pb-4">
            <form onSubmit={handleSearch} className="flex items-center justify-center">
              <div className="relative w-full max-w-2xl">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="프로젝트 검색..."
                  className="w-full px-4 py-2 pr-10 
                    bg-gray-100 dark:bg-gray-700 
                    border border-gray-300 dark:border-gray-600 
                    rounded-lg
                    text-gray-900 dark:text-white
                    focus:outline-none focus:ring-0
                    transition-colors duration-200"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2
                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  🔍
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </header>
  )
}