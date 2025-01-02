'use client'

import { Auth } from '@/app/components/Auth'
import { useTheme } from '@/context/ThemeContext'
import { DarkModeToggle } from '@/components/DarkModeToggle'
import { useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { useFirebase } from '@/context/FirebaseContext'

export default function LoginPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { auth } = useFirebase()

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const db = getFirestore()
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.role === 'visitor') {
              alert('관리자 승인 후 접속 가능합니다.')
              // visitor인 경우 자동 로그아웃
              await signOut(auth)
              return
            } else {
              router.push('/main')
            }
          }
        } catch (error) {
          console.error('사용자 권한 확인 중 오류:', error)
          alert('사용자 권한을 확인하는 중 오류가 발생했습니다.')
        }
      }
    }

    checkUserRole()
  }, [user, router, auth])

  return (
    <div className="relative">
      <Auth />
      <DarkModeToggle />
    </div>
  )
} 