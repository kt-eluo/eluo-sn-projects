'use client'

import { useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'

export const useAdmin = () => {
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getAuth()
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // users 컬렉션에서 현재 사용자의 문서 조회
          const userRef = doc(db, 'users', user.uid)
          const userDoc = await getDoc(userRef)
          
          if (userDoc.exists()) {
            // role이 'admin'인 경우에만 관리자로 설정
            setIsAdminUser(userDoc.data().role === 'admin')
          } else {
            setIsAdminUser(false)
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
          setIsAdminUser(false)
        }
      } else {
        setIsAdminUser(false)
      }
      setLoading(false)
    })

    // 클린업 함수
    return () => unsubscribe()
  }, [])

  return { isAdminUser, loading }
}