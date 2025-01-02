'use client'

import { useFirebase } from '@/context/FirebaseContext'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import Image from 'next/image'
import LogoBlack from '@/app/images/logo_square_bk.png'
import LogoWhite from '@/app/images/logo_square_wh.png'

export function Auth() {
  const { auth } = useFirebase()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordMatch, setPasswordMatch] = useState(false)
  const router = useRouter()
  const { darkMode } = useTheme()

  useEffect(() => {
    if (user) {
      router.push('/main')
    }
  }, [user, router])

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')

    if (!auth) {
      console.error('Firebase auth is not initialized')
      setError('인증 서비스 초기화에 실패했습니다')
      return
    }

    if (isSignUp && !passwordMatch) {
      alert('비밀번호가 일치하지 않습니다')
      return
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        
        const db = getFirestore()
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          role: 'visitor',
          createdAt: new Date()
        })

        alert('회원가입이 성공적으로 완료되었습니다!')
        console.log('회원가입 성공')
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        
        try {
          const db = getFirestore()
          const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.role === 'admin') {
              alert('관리자로 로그인되었습니다')
            } else if (userData.role !== 'visitor') {
              alert('로그인 성공!')
            }
          }
        } catch (firestoreError) {
          console.error('Firestore 조회 실패:', firestoreError)
        }
        
        console.log('로그인 성공')
        router.push('/main')
      }
      setEmail('')
      setPassword('')
      setPasswordConfirm('')
    } catch (error) {
      console.error('Error during auth:', error)
      
      // Firebase 에러 코드에 따른 다른 메시지 표시
      let errorMessage = ''
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = '이미 사용 중인 이메일입니다'
          break
        case 'auth/invalid-email':
          errorMessage = '유효하지 않은 이메일 형식입니다'
          break
        case 'auth/operation-not-allowed':
          errorMessage = '이메일/비밀번호 로그인이 비활성화되어 있습니다'
          break
        case 'auth/weak-password':
          errorMessage = '비밀번호는 6자 이상이어야 합니다'
          break
        case 'auth/user-not-found':
          errorMessage = '등록되지 않은 이메일입니다'
          break
        case 'auth/wrong-password':
          errorMessage = '잘못된 비밀번호입니다'
          break
        case 'auth/operation-not-allowed':
          errorMessage = 'Google 로그인이 활성화되지 않았습니다. 관리자에게 문의하세요.'
          break
        default:
          errorMessage = '로그인/회원가입 중 오류가 발생했습니다'
      }
      
      alert(errorMessage)
      setError(errorMessage)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      console.log('로그아웃 성공')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  const handlePasswordConfirmChange = (e) => {
    const confirmValue = e.target.value;
    setPasswordConfirm(confirmValue);
    setPasswordMatch(confirmValue === password);
  }

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordMatch(newPassword === passwordConfirm);
  }

  const toggleSignUp = () => {
    setIsSignUp(!isSignUp);
    console.log('회원가입 모드:', !isSignUp);
  }

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.push('/main')
    } catch (error) {
      console.error('Google 로그인 실패:', error)
      setError('Google 로그인 중 오류가 발생했습니다')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-md transition-colors duration-500">
        <div className="flex justify-center p-8">
          <Image
            src={darkMode ? LogoWhite : LogoBlack}
            alt="Company Logo"
            width={150}
            height={150}
            priority
            className="transition-opacity duration-500"
          />
        </div>
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-8 text-center text-gray-400 dark:text-white transition-colors duration-500">
            {isSignUp ? '회원가입' : '로그인'}
          </h2>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-white dark:bg-gray-700 text-gray-400 dark:text-white 
              border border-gray-300 dark:border-gray-600
              p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600
              flex items-center justify-center gap-3 mb-6
              transition-all duration-300"
          >
            <Image
              src="/google.svg"
              alt="Google Logo"
              width={20}
              height={20}
            />
            Google로 계속하기
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">
                또는
              </span>
            </div>
          </div>

          {error && <p className="text-red-500 mb-6 text-center">{error}</p>}
          
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="mb-4">
              <label className="block mb-2 text-gray-400 dark:text-white transition-colors duration-500">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 text-gray-400 dark:text-white transition-colors duration-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-gray-400 dark:text-white transition-colors duration-500">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                className="w-full p-2 border rounded dark:bg-gray-700 text-gray-400 dark:text-white transition-colors duration-500"
                placeholder="6자 이상, 문자와 숫자 포함"
                required
                minLength={6}
              />
            </div>
            {isSignUp && (
              <div className="mb-6">
                <label className="block mb-2 text-gray-400 dark:text-white transition-colors duration-500">비밀번호 확인</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={handlePasswordConfirmChange}
                  className={`w-full p-2 border rounded dark:bg-gray-700 text-gray-400 dark:text-white transition-colors duration-500 ${
                    passwordConfirm && !passwordMatch ? 'border-red-500' : ''
                  }`}
                  placeholder="비밀번호를 한번 더 입력해주세요"
                  required
                  minLength={6}
                />
                {passwordConfirm && !passwordMatch && (
                  <p className="text-red-500 text-sm mt-1 text-gray-400 dark:text-white transition-colors duration-500">
                    비밀번호가 일치하지 않습니다
                  </p>
                )}
                {passwordConfirm && passwordMatch && (
                  <p className="text-green-500 text-sm mt-1 text-gray-400 dark:text-white transition-colors duration-500">
                    비밀번호가 일치합니다
                  </p>
                )}
              </div>
            )}
            <button
              type="submit"
              className={`w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-4 ${
                isSignUp && !passwordMatch ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isSignUp && !passwordMatch}
            >
              {isSignUp ? '회원가입' : '로그인'}
            </button>
          </form>

          <div className="mt-6">
            <button
              onClick={toggleSignUp}
              className="w-full text-blue-500 hover:text-blue-600 transition-colors duration-300"
            >
              {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 