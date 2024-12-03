'use client'

import { useState, useEffect } from 'react'
import { useFirebase } from '@/context/FirebaseContext'

export function useAuth() {
  const { auth } = useFirebase()
  const [authState, setAuthState] = useState({
    user: null,
    loading: true,
    data: {
      email: null,
      uid: null,
      emailVerified: false,
    }
  })

  useEffect(() => {
    // 인증 상태 변화 구독
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // 로그인 상태
        console.log('로그인 감지:', user.email)
        setAuthState({
          user: user,
          loading: false,
          data: {
            email: user.email,
            uid: user.uid,
            emailVerified: user.emailVerified,
          }
        })
      } else {
        // 로그아웃 상태
        console.log('로그아웃 감지')
        setAuthState({
          user: null,
          loading: false,
          data: {
            email: null,
            uid: null,
            emailVerified: false,
          }
        })
      }
    })

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe()
  }, [auth])

  // 개발 환경에서 인증 상태 변화 로깅
  if (process.env.NODE_ENV === 'development') {
    auth.onAuthStateChanged((user) => {
      console.log('Auth State Changed:', user ? user.email : '로그아웃')
    })
  }

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('현재 사용자 UID:', user.uid); // 이 UID를 Firebase Console에서 사용
      }
    });
    return () => unsubscribe();
  }, [auth]);

  return authState
} 