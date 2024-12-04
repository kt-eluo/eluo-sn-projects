'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { Header } from '@/components/Header'
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore'
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
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 12;

  const fetchUserProjects = async (userId) => {
    if (!userId) {
      setProjects([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    try {
      const db = getFirestore();
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      const projectsRef = collection(db, 'projects', userId, 'userProjects');
      const querySnapshot = await getDocs(projectsRef);

      if (querySnapshot.empty) {
        setProjects([]);
        return;
      }

      const projectsList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const projectData = {
          id: doc.id,
          title: data.title || '제목 없음',
          status: data.status || '대기',
          description: data.description || '',
          requestDate: data.requestDate,
          startDate: data.startDate,
          endDate: data.endDate,
          planning: data.planning || { name: '', effort: 0 },
          design: data.design || { name: '', effort: 0 },
          publishing: data.publishing || { name: '', effort: 0 },
          development: data.development || { name: '', effort: 0 }
        };

        projectData.totalEffort = 
          Number(projectData.planning.effort || 0) +
          Number(projectData.design.effort || 0) +
          Number(projectData.publishing.effort || 0) +
          Number(projectData.development.effort || 0);

        projectsList.push(projectData);
      });

      setProjects(projectsList);

    } catch (error) {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else {
        fetchUserProjects(user.uid);
      }
    }
  }, [user, loading, router]);

  // 날짜 필터링 함수
  const getFilteredProjects = (projects) => {
    // 상태 필터 적용
    let filtered = projects.filter(project => 
      statusFilter === '전체' || project.status === statusFilter
    );

    // 커스텀 날짜 범위가 있는 경우
    if (startDate && endDate) {
      filtered = filtered.filter(project => {
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

    // 시작일 기준 최신순 정렬
    return filtered.sort((a, b) => {
      const dateA = a.startDate?.toDate() || new Date(0)
      const dateB = b.startDate?.toDate() || new Date(0)
      return dateB - dateA
    })
  }

  // 필터링된 프로젝트 계산
  const filteredProjects = getFilteredProjects(projects);
  
  // 페이지네이션 로직
  const indexOfLastProject = currentPage * projectsPerPage;
  const indexOfFirstProject = indexOfLastProject - projectsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstProject, indexOfLastProject);
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

  // 통합된 핸들러 함수들
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handlePeriodFilterChange = (period) => {
    setPeriodFilter(period);
    setCustomDateRange([null, null]);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (update) => {
    setCustomDateRange(update);
    if (update[0] && update[1]) {
      setPeriodFilter('전체');
      setCurrentPage(1);
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
              내 프로젝트 목록
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                (총 {filteredProjects.length}개)
              </span>
            </h1>

            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <div className="flex gap-1.5 w-full sm:w-[320px]">
                {['전체', '진행', '대기', '종료'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2 py-1 text-xs rounded-md transition-all
                      w-[calc(100%/4)]
                      ${statusFilter === status
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5 w-full sm:w-[320px]">
                {['전체', '1주일', '1개월', '3개월'].map((period) => (
                  <button
                    key={period}
                    onClick={() => handlePeriodFilterChange(period)}
                    disabled={startDate && endDate}
                    className={`px-2 py-1 text-xs rounded-md transition-all
                      w-[calc(100%/4)]
                      ${periodFilter === period
                        ? 'bg-green-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                      ${startDate && endDate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-[320px] flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-md">
                <DatePicker
                  selected={startDate}
                  onChange={(date) => handleDateRangeChange([date, endDate])}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="연도-월-일"
                  className="w-[calc(50%-0.75rem)] px-2 py-1 text-xs rounded-md
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    border border-gray-200 dark:border-gray-600
                    focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                
                <span className="text-gray-500 dark:text-gray-400 text-xs">~</span>
                
                <DatePicker
                  selected={endDate}
                  onChange={(date) => handleDateRangeChange([startDate, date])}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="연도-월-일"
                  className="w-[calc(50%-0.75rem)] px-2 py-1 text-xs rounded-md
                    bg-white dark:bg-gray-700 
                    text-gray-900 dark:text-white
                    border border-gray-200 dark:border-gray-600
                    focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 프로젝트 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {currentProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/detail/${project.id}`)}
                className={`rounded-xl shadow-md hover:shadow-xl 
                  transition-all duration-300 ease-in-out transform hover:-translate-y-1
                  p-4 sm:p-6 cursor-pointer
                  ${project.status === '료' 
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
                        <span className="text-gray-500 dark:text-gray-400">현업요청일:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {project.requestDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">시작일:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {project.startDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">종료일:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {project.endDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">전체 공수:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {project.totalEffort}h
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {project.planning.name && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          기획: {project.planning.name} ({project.planning.effort}h)
                        </span>
                      )}
                      {project.design.name && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          디자인: {project.design.name} ({project.design.effort}h)
                        </span>
                      )}
                      {project.publishing.name && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          퍼블: {project.publishing.name} ({project.publishing.effort}h)
                        </span>
                      )}
                      {project.development.name && (
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          개발: {project.development.name} ({project.development.effort}h)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length > 0 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm
                  ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                이전
              </button>
              
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`px-3 py-1 rounded-md text-sm
                    ${currentPage === index + 1
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                >
                  {index + 1}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm
                  ${currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
              >
                다음
              </button>
            </div>
          )}

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