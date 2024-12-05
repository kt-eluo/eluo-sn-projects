'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { getFirestore, doc, setDoc, collection, getDoc, serverTimestamp } from 'firebase/firestore'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { useTheme } from '@/context/ThemeContext'

export default function Page() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { darkMode } = useTheme()
  
  const [newProject, setNewProject] = useState({
    title: '',
    status: '대기',
    description: '',
    requestDate: new Date(),
    startDate: new Date(),
    endDate: new Date(),
    planning: { name: '', effort: '' },
    design: { name: '', effort: '' },
    publishing: { name: '', effort: '' },
    development: { name: '', effort: '' },
    totalEffort: null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) return
    
    const checkAdminStatus = async () => {
      try {
        const db = getFirestore()
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true)
        } else {
          router.push('/main')
        }
      } catch (error) {
        console.error('관리자 권한 확인 중 오류:', error)
        router.push('/main')
      }
    }

    checkAdminStatus()
  }, [user, router])

  const calculateTotalEffort = (updatedProject) => {
    const efforts = [
      updatedProject.planning.effort,
      updatedProject.design.effort,
      updatedProject.publishing.effort
    ]
    
    // 모든 effort 값이 빈 문자열인지 확인
    const allEmpty = efforts.every(effort => effort === '')
    if (allEmpty) return null

    // 입력된 공수값들을 직접 합산
    const total = efforts.reduce((sum, effort) => {
      if (effort === '') return sum
      return sum + Number(effort)
    }, 0)
    
    return total > 0 ? Number(total.toFixed(2)) : null
  }

  const handleEffortChange = (field, value) => {
    setNewProject(prev => {
      const updated = {
        ...prev,
        [field]: { ...prev[field], effort: value }
      }

      // 개발을 제외한 나머지 필드들만 체크
      const allEmpty = ['planning', 'design', 'publishing'].every(
        type => updated[type].effort === ''
      )

      // 즉시 새로운 전체 공수 계산
      const newTotalEffort = calculateTotalEffort(updated)

      return {
        ...updated,
        totalEffort: newTotalEffort
      }
    })
  }

  if (!isAdmin) {
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    try {
      const db = getFirestore()
      const newProjectRef = doc(collection(db, 'projects', user.uid, 'userProjects'))
      
      const projectData = {
        title: newProject.title,
        status: newProject.status,
        description: newProject.description,
        requestDate: newProject.requestDate,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        planning: {
          name: newProject.planning.name,
          effort: newProject.planning.effort === '' ? null : Number(newProject.planning.effort)
        },
        design: {
          name: newProject.design.name,
          effort: newProject.design.effort === '' ? null : Number(newProject.design.effort)
        },
        publishing: {
          name: newProject.publishing.name,
          effort: newProject.publishing.effort === '' ? null : Number(newProject.publishing.effort)
        },
        development: {
          name: newProject.development.name,
          effort: newProject.development.effort === '' ? null : Number(newProject.development.effort)
        },
        totalEffort: calculateTotalEffort(newProject),
        createAt: serverTimestamp(),
        updateAt: serverTimestamp()
      }
      
      await setDoc(newProjectRef, projectData)

      alert('프로젝트가 성공적으로 등록되었습니다.')
      router.push('/main')
    } catch (error) {
      console.error('프로젝트 등록 오류:', error)
      alert('프로젝트 등록 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
            <form onSubmit={handleSubmit}>
              {/* 제목 및 상태 */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 
                      text-gray-900 dark:text-white"
                    placeholder="프로젝트 제목"
                    required
                  />
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({...newProject, status: e.target.value})}
                    className="px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 
                      text-gray-900 dark:text-white"
                  >
                    <option value="대기">대기</option>
                    <option value="진행">진행</option>
                    <option value="종료">종료</option>
                  </select>
                </div>
              </div>

              {/* 날짜 선택 */}
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    현업 요청일
                  </label>
                  <DatePicker
                    selected={newProject.requestDate}
                    onChange={(date) => setNewProject({...newProject, requestDate: date})}
                    dateFormat="yyyy-MM-dd"
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 
                      text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    시작일
                  </label>
                  <DatePicker
                    selected={newProject.startDate}
                    onChange={(date) => setNewProject({...newProject, startDate: date})}
                    dateFormat="yyyy-MM-dd"
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 
                      text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    종료일
                  </label>
                  <DatePicker
                    selected={newProject.endDate}
                    onChange={(date) => setNewProject({...newProject, endDate: date})}
                    dateFormat="yyyy-MM-dd"
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 
                      text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* 담당자 및 공수 입력 영역 위에 전체 공수 표시 */}
              <div className="mb-8">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">전체 공수</h3>
                    <span className="text-sm text-red-500">전체 공수는 자동으로 합산됩니다. (* 개발 공수 제외)</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {newProject.totalEffort === null ? '-' : `${newProject.totalEffort}m`}
                  </p>
                </div>
              </div>

              {/* 담당자 및 공수 입력 */}
              <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 기획 */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">기획</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newProject.planning.name}
                      onChange={(e) => setNewProject({
                        ...newProject,
                        planning: { ...newProject.planning, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 
                        text-gray-900 dark:text-white"
                      placeholder="담당자명"
                    />
                    <input
                      type="number"
                      value={newProject.planning.effort}
                      onChange={(e) => handleEffortChange('planning', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 
                        text-gray-900 dark:text-white"
                      placeholder="공수 (시간)"
                    />
                  </div>
                </div>

                {/* 디자인 */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">디자인</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newProject.design.name}
                      onChange={(e) => setNewProject({
                        ...newProject,
                        design: { ...newProject.design, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 
                        text-gray-900 dark:text-white"
                      placeholder="담당자명"
                    />
                    <input
                      type="number"
                      value={newProject.design.effort}
                      onChange={(e) => handleEffortChange('design', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 
                        text-gray-900 dark:text-white"
                      placeholder="공수 (시간)"
                    />
                  </div>
                </div>

                {/* 퍼블리싱 */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">퍼블리싱</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newProject.publishing.name}
                      onChange={(e) => setNewProject({
                        ...newProject,
                        publishing: { ...newProject.publishing, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 
                        text-gray-900 dark:text-white"
                      placeholder="담당자명"
                    />
                    <input
                      type="number"
                      value={newProject.publishing.effort}
                      onChange={(e) => handleEffortChange('publishing', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 
                        text-gray-900 dark:text-white"
                      placeholder="공수 (시간)"
                    />
                  </div>
                </div>

                {/* 개발 */}
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">개발</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newProject.development.name}
                      onChange={(e) => setNewProject({
                        ...newProject,
                        development: { ...newProject.development, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 
                        text-gray-900 dark:text-white"
                      placeholder="담당자명"
                    />
                    <input
                      type="number"
                      value={newProject.development.effort}
                      onChange={(e) => handleEffortChange('development', e.target.value)}
                      className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 
                        text-gray-900 dark:text-white"
                      placeholder="공수 (시간)"
                    />
                  </div>
                </div>

              </div>

              {/* 프로젝트 설명 */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">프로젝트 설명</h3>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg
                    border border-gray-300 dark:border-gray-600 
                    text-gray-900 dark:text-white"
                  rows="4"
                  placeholder="프로젝트 설명을 입력하세요"
                />
              </div>

              {/* 저장/취소/목록 버튼 영역 */}
              <div className="flex justify-end gap-4 mt-8">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-white
                    ${isLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600 transition-colors'
                    }`}
                >
                  {isLoading ? '장 중...' : '저장'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/main')}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  목록으로
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 