'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import { useAdmin } from '@/app/hooks/useAdmin'

export function AdminRoute({ children }) {
  const { isAdminUser, loading: adminLoading } = useAdmin()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // 인증 또는 관리자 확인 중일 때 로딩 표시
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!user) {
    router.push('/login')
    return null
  }

  // 관리자가 아닌 경우 메인 페이지로 리다이렉트
  if (!isAdminUser) {
    router.push('/main')
    return null
  }

  // 관리자인 경우 children 렌더링
  return children
}