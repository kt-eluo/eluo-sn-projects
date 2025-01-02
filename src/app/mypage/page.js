'use client'

import { useAuth } from '@/app/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'
import { Header } from '@/components/Header'
import { useState } from 'react'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { useFirebase } from '@/context/FirebaseContext'

export default function MyPage() {
  const { user } = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const { auth } = useFirebase()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState({ text: '', isError: false })

  if (!user) {
    return <div>로그인이 필요합니다.</div>
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setMessage({ text: '', isError: false })
    
    if (newPassword !== confirmPassword) {
      setMessage({ text: '새 비밀번호가 일치하지 않습니다.', isError: true })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ text: '비밀번호는 최소 6자 이상이어야 합니다.', isError: true })
      return
    }

    try {
      // 재인증 처리
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      )
      await reauthenticateWithCredential(auth.currentUser, credential)

      // 비밀번호 변경
      await updatePassword(auth.currentUser, newPassword)
      setMessage({ text: '비밀번호가 성공적으로 변경되었습니다.', isError: false })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password change error:', error)
      if (error.code === 'auth/wrong-password') {
        setMessage({ text: '현재 비밀번호가 올바르지 않습니다.', isError: true })
      } else {
        setMessage({ text: '비밀번호 변경 중 오류가 발생했습니다.', isError: true })
      }
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">마이페이지</h1>
        
        {/* 사용자 정보 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2 dark:text-white">사용자 정보</h2>
            <p className="text-gray-600 dark:text-gray-300">이메일: {user.email}</p>
          </div>
        </div>

        {/* 비밀번호 변경 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">비밀번호 변경</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="현재 비밀번호 입력"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="새 비밀번호 입력"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="새 비밀번호 다시 입력"
                required
              />
            </div>
            {message.text && (
              <p className={`text-sm ${message.isError ? 'text-red-500' : 'text-green-500'}`}>
                {message.text}
              </p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                transition-colors duration-200 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              비밀번호 변경
            </button>
          </form>
        </div>

        <button
          onClick={toggleTheme}
          className="fixed bottom-14 right-4 
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
              <span className="hidden md:inline text-[14px]">라이트 모드</span>
            </>
          ) : (
            <>
              <span className="mr-1 sm:mr-2">🌑</span>
              <span className="hidden md:inline text-[14px]">다크 모드</span>
            </>
          )}
        </button>
      </div>
    </>
  )
}
