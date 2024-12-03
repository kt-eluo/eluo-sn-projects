'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { Header } from '@/components/Header'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import '@/styles/main.css'

export default function MainPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { darkMode } = useTheme()
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('전체')
  const [periodFilter, setPeriodFilter] = useState('전체')
  const [customDateRange, setCustomDateRange] = useState([null, null]);
  const [startDate, endDate] = customDateRange;

  const fetchUserProjects = async (userId) => {
    if (!userId) return;

    try {
      const db = getFirestore()
      const userProjectsRef = collection(db, 'projects', userId, 'userProjects')
      const q = query(userProjectsRef, orderBy('createAt', 'desc'))
      
      const querySnapshot = await getDocs(q)
      
      const projectsList = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || '제목 없음',
          description: data.description || '',
          status: data.status || '대기',
          availableHours: data.availableHours || 0,
          team: data.team || [],
          startDate: data.startDate,
          endDate: data.endDate,
          createAt: data.createAt,
          updateAt: data.updateAt
        }
      })

      setProjects(projectsList)
    } catch (error) {
      console.error('프로젝트 데이터 가져오기 오류:', error)
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/')
      } else {
        fetchUserProjects(user.uid)
      }
    }
  }, [user, loading, router])

  // 날짜 필터링 함수 수정
  const getFilteredProjects = (projects) => {
    // 상태 필터 적용
    let filtered = projects.filter(project => 
      statusFilter === '전체' || project.status === statusFilter
    );

    // 커스텀 날짜 범위가 있는 경우
    if (startDate && endDate) {
      return filtered.filter(project => {
        const projectStartDate = project.startDate?.toDate()
        if (!projectStartDate) return false
        return projectStartDate >= startDate && projectStartDate <= endDate
      })
    }

    // 기간 필터 적용
    if (periodFilter !== '전체') {
      const today = new Date()
      const getDateBefore = (days) => {
        const date = new Date()
        date.setDate(date.getDate() - days)
        return date
      }

      filtered = filtered.filter(project => {
        const projectStartDate = project.startDate?.toDate()
        if (!projectStartDate) return false

        switch (periodFilter) {
          case '1주일':
            return projectStartDate >= getDateBefore(7)
          case '1개월':
            return projectStartDate >= getDateBefore(30)
          case '3개월':
            return projectStartDate >= getDateBefore(90)
          default:
            return true
        }
      })
    }

    return filtered
  }

  // 필터링된 프로젝트 계산
  const filteredProjects = getFilteredProjects(projects);

  // 커스텀 날짜 범위 선택 시 기간 필터 초기화
  const handleDateRangeChange = (update) => {
    setCustomDateRange(update);
    if (update[0] && update[1]) {
      setPeriodFilter('전체');
    }
  };

  // 기간 필터 선택 시 커스텀 날짜 범위 초기화
  const handlePeriodFilterChange = (period) => {
    setPeriodFilter(period);
    setCustomDateRange([null, null]);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                내 프로젝트 목록 
                <span className="ml-2 text-sm sm:text-base text-gray-500 dark:text-gray-400">
                  (총 {filteredProjects.length}개)
                </span>
              </h1>
            </div>

            {/* 필터 컨테이너를 오른쪽으로 정렬 */}
            <div className="flex flex-col gap-2 sm:items-end">
              {/* 상태 필터 */}
              <div className="flex gap-2 w-full sm:w-[400px]">
                {['전체', '진행', '대기', '종료'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all
                      w-[calc(100%/4)] min-w-[80px]
                      ${statusFilter === status
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* 기간 필터 */}
              <div className="flex gap-2 w-full sm:w-[400px]">
                {['전체', '1주일', '1개월', '3개월'].map((period) => (
                  <button
                    key={period}
                    onClick={() => handlePeriodFilterChange(period)}
                    disabled={startDate && endDate}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-all
                      w-[calc(100%/4)] min-w-[80px]
                      ${periodFilter === period
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }
                      ${startDate && endDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              {/* 달력 기간 선택 */}
              <div className="w-full sm:w-[400px] flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => handleDateRangeChange([date, endDate])}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="연도-월-일"
                  className="w-[calc(50%-1rem)] px-3 py-2 text-sm rounded-lg
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    border border-gray-300 dark:border-gray-600
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                <span className="text-gray-500 dark:text-gray-400">~</span>
                
                <DatePicker
                  selected={endDate}
                  onChange={(date) => handleDateRangeChange([startDate, date])}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="연도-월-일"
                  className="w-[calc(50%-1rem)] px-3 py-2 text-sm rounded-lg
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    border border-gray-300 dark:border-gray-600
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 프로젝트 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/detail/${project.id}`)}
                className={`rounded-xl shadow-md hover:shadow-xl 
                  transition-all duration-300 ease-in-out transform hover:-translate-y-1
                  p-4 sm:p-6 cursor-pointer
                  ${project.status === '종료' 
                    ? 'bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 opacity-60 dark:opacity-40 hover:opacity-90 dark:hover:opacity-70' 
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 opacity-100'
                  }
                  ${project.status === '종료'
                    ? 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'hover:bg-white dark:hover:bg-gray-800'
                  }`}
              >
                <div className="h-full flex flex-col">
                  <div className="mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`text-lg sm:text-xl font-bold line-clamp-2
                        ${project.status === '종료' 
                          ? 'text-gray-500 dark:text-gray-500' 
                          : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {project.title}
                      </h3>
                      <div className={`ml-2 px-2.5 py-1 text-xs sm:text-sm rounded-full whitespace-nowrap
                        ${project.status === '진행' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                          : project.status === '대기' 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}
                      >
                        {project.status}
                      </div>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                  </div>

                  <div className="mt-auto">
                    <div className="mb-4 space-y-2">
                      <div className="text-sm flex items-center justify-between">
                        <span className={`text-gray-500 dark:text-gray-400 
                          ${project.status === '종료' ? 'text-gray-400 dark:text-gray-500' : ''}`}
                        >
                          시작일:
                        </span>
                        <span className={`font-medium
                          ${project.status === '종료' 
                            ? 'text-gray-500 dark:text-gray-500' 
                            : 'text-gray-900 dark:text-white'}`}
                        >
                          {project.startDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm flex items-center justify-between">
                        <span className={`text-gray-500 dark:text-gray-400
                          ${project.status === '종료' ? 'text-gray-400 dark:text-gray-500' : ''}`}
                        >
                          종료일:
                        </span>
                        <span className={`font-medium
                          ${project.status === '종료' 
                            ? 'text-gray-500 dark:text-gray-500' 
                            : 'text-gray-900 dark:text-white'}`}
                        >
                          {project.endDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3 text-sm">
                      <span className={`text-gray-500 dark:text-gray-400
                        ${project.status === '종료' ? 'text-gray-400 dark:text-gray-500' : ''}`}
                      >
                        가용 시간:
                      </span>
                      <span className={`ml-2 font-semibold
                        ${project.status === '종료' 
                          ? 'text-gray-500 dark:text-gray-500' 
                          : 'text-gray-900 dark:text-white'}`}
                      >
                        {project.availableHours}h
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {project.team.map((member, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 text-xs sm:text-sm rounded-full
                            ${project.status === '종료'
                              ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                          {member}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {statusFilter === '전체' && periodFilter === '전체' 
                  ? '등록된 프로젝트가 없습니다.' 
                  : '선택한 필터에 해당하는 프로젝트가 없습니다.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 