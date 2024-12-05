'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { Header } from '@/components/Header'
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc, addDoc } from 'firebase/firestore';
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import '@/styles/main.css'

export default function MainPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { darkMode } = useTheme()
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [statusFilter, setStatusFilter] = useState('전체')
  const [periodFilter, setPeriodFilter] = useState('전체')
  const [customDateRange, setCustomDateRange] = useState([null, null]);
  const [startDate, endDate] = customDateRange;
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 12;
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth() + 1);
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const [isCopyMode, setIsCopyMode] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return
      
      try {
        const db = getFirestore()
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true)
        }
      } catch (error) {
        console.error('관리자 권한 확인 중 오류:', error)
      }
    }

    checkAdminStatus()
  }, [user])

  const fetchUserProjects = async (userId) => {
    if (!userId) {
      setProjects([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    try {
      const db = getFirestore();
      const allProjects = [];
      
      // 모든 사용자의 프로젝트를 가져오기 위해 users 컬렉션을 먼저 조회
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      // 각 사용자의 프로젝트를 순차적으로 가져오기
      for (const userDoc of usersSnapshot.docs) {
        const projectsRef = collection(db, 'projects', userDoc.id, 'userProjects');
        const q = query(projectsRef, orderBy('createAt', 'desc'));
        const projectsSnapshot = await getDocs(q);
        
        projectsSnapshot.forEach((doc) => {
          const data = doc.data();
          allProjects.push({
            id: doc.id,
            userId: userDoc.id, // 프로젝트 소유자의 ID 저장
            userEmail: userDoc.data().email, // 프로젝트 소유자의 이메일 저장
            ...data
          });
        });
      }

      // 생성일 기준 내림차순 정렬
      allProjects.sort((a, b) => b.createAt - a.createAt);
      
      setProjects(allProjects);

    } catch (error) {
      console.error('프로젝트 목록 가져오기 오류:', error);
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
          case '1주':
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

    // 월별 필터 적용
    if (monthFilter !== '전체') {
      filtered = filtered.filter(project => {
        const startDate = project.startDate?.toDate();
        if (!startDate) return false;
        
        const projectMonth = startDate.getMonth() + 1; // 0부터 시작하므로 1을 더함
        return projectMonth === Number(monthFilter);
      });
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

  // 전체 공수 계산 함수 수정
  const getCurrentMonthTotalEffort = (projects) => {
    if (!projects || projects.length === 0) return '-'
    
    const total = projects.reduce((total, project) => {
      if (!project.startDate) return total
      
      const startDate = project.startDate.toDate()
      const projectMonth = startDate.getMonth() + 1
      const projectYear = startDate.getFullYear()

      if (projectYear === displayYear && projectMonth === displayMonth) {
        const planningEffort = Number(project.planning?.effort || 0)
        const designEffort = Number(project.design?.effort || 0)
        const publishingEffort = Number(project.publishing?.effort || 0)
        
        const sum = planningEffort + designEffort + publishingEffort
        return total + sum
      }
      return total
    }, 0)

    // total이 0이거나 NaN이면 '-' 반환
    if (!total || isNaN(total)) return '-'
    
    // 소수점이 없으면 정수로, 있으면 소수점 1자리까지 표시
    return Number.isInteger(total) ? Math.floor(total) : Number(total.toFixed(1))
  }

  const handleMonthFilterChange = (month) => {
    setMonthFilter(month);
    if (month !== '전체') {
      setDisplayMonth(month);
    } else {
      setDisplayMonth(new Date().getMonth() + 1);
    }
    setCurrentPage(1);
  };

  // 공수를 일수로 변환하는 함수 수정
  const convertEffortToDay = (effort) => {
    if (effort === '-' || !effort) return '-'
    const days = effort / 0.5
    // 소수점이 없으면 정수로, 있으면 소수점 1자리까지 표시
    return days > 0 ? `${Number.isInteger(days) ? Math.floor(days) : days.toFixed(1)}일` : '-'
  }

  const handleCopy = async (projectId) => {
    try {
      // 확인 알럿
      const isConfirmed = window.confirm("해당 프로젝트를 복사하시겠습니까?");
      
      if (!isConfirmed) return;

      const db = getFirestore();
      
      // 원본 프로젝트 데이터 가오기
      const originalProjectRef = doc(db, 'projects', user.uid, 'userProjects', projectId);
      const originalProjectSnap = await getDoc(originalProjectRef);
      
      if (!originalProjectSnap.exists()) {
        throw new Error('원본 프로젝트를 찾을 수 없습니다.');
      }

      const originalData = originalProjectSnap.data();
      
      // 새로운 프로젝트 데이터 준비
      const newProjectData = {
        ...originalData,
        title: `${originalData.title} (복사본)`,
        status: '대기',
        requestDate: originalData.requestDate,
        startDate: originalData.startDate,
        endDate: originalData.endDate,
        createAt: new Date(), // 생성일만 현재 시간으로
        updateAt: new Date(), // 수정일만 현재 시간으로
        planning: originalData.planning || { name: '', effort: 0 },
        design: originalData.design || { name: '', effort: 0 },
        publishing: originalData.publishing || { name: '', effort: 0 },
        development: originalData.development || { name: '', effort: 0 }
      };

      // 새 프로젝트 문서 생성
      const newProjectRef = collection(db, 'projects', user.uid, 'userProjects');
      await addDoc(newProjectRef, newProjectData);

      // 성공 메시지
      alert('프로젝트가 복사되었습니다.');
      
      // 모든 프로젝트 다시 불러오기
      if (user) {
        await fetchUserProjects(user.uid);
      }
      
      // 복사 모드 종료
      setIsCopyMode(false);

    } catch (error) {
      console.error('프로젝트 복사 중 오류:', error);
      alert('프로젝트 복사 중 오류가 발생했습니다.');
    }
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
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-16">
            <div>
              {/* 현재 달 공수 표시 - 더 크고 강조되게 수정 */}
              <div className="mb-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {monthFilter === '전체' 
                    ? '전체 프로젝트'
                    : `${displayYear}년 ${displayMonth}월`
                  }
                  <span className="ml-2 text-xl text-blue-500 dark:text-blue-400 font-semibold">
                    {monthFilter === '전체' 
                      ? `(전체 공수 총 ${!isLoading ? getCurrentMonthTotalEffort(projects) : '-'}${getCurrentMonthTotalEffort(projects) !== '-' ? 'm' : ''} / ${convertEffortToDay(getCurrentMonthTotalEffort(projects))})`
                      : `(${displayMonth}월 공수 총 ${!isLoading ? getCurrentMonthTotalEffort(projects) : '-'}${getCurrentMonthTotalEffort(projects) !== '-' ? 'm' : ''} / ${convertEffortToDay(getCurrentMonthTotalEffort(projects))})`
                    }
                  </span>
                </h2>
              </div>
              
              {/* 기존 제목 - 상대적으로 작게 정 */}
              <h1 className="text-lg text-gray-700 dark:text-gray-300 whitespace-nowrap">
                전체 프로젝트 목록
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  (총 {filteredProjects.length}개)
                </span>
              </h1>
            </div>

            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <div className="flex flex-col gap-1.5 w-full sm:w-[320px]">
                {/* 상태 필터 버튼 */}
                <div className="flex gap-1.5 w-full">
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

                <div className="flex flex-col gap-1.5 w-full sm:w-[320px]">
                  {/* 1월 ~ 6월 */}
                  <div className="flex gap-1.5 w-full">
                    {[1, 2, 3, 4, 5, 6].map((month) => (
                      <button
                        key={month}
                        onClick={() => handleMonthFilterChange(month)}
                        className={`px-2 py-1 text-xs rounded-md transition-all
                          w-[calc(100%/6)]
                          ${monthFilter === month
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                      >
                        {month}월
                      </button>
                    ))}
                  </div>
                  
                  {/* 7월 ~ 12월 */}
                  <div className="flex gap-1.5 w-full">
                    {[7, 8, 9, 10, 11, 12].map((month) => (
                      <button
                        key={month}
                        onClick={() => handleMonthFilterChange(month)}
                        className={`px-2 py-1 text-xs rounded-md transition-all
                          w-[calc(100%/6)]
                          ${monthFilter === month
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                      >
                        {month}월
                      </button>
                    ))}
                  </div>
                  
                  {/* 전체 버튼 */}
                  <div className="flex w-full">
                    <button
                      onClick={() => handleMonthFilterChange('���체')}
                      className={`px-2 py-1 text-xs rounded-md transition-all
                        w-full
                        ${monthFilter === '전체'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      전체
                    </button>
                  </div>
                </div>

                {/* DatePicker */}
                <div className="w-full flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-md">
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
          </div>


          {/* 새 프로젝트 추가 및 복사 버튼 */}
          {isAdmin && (
            <div className="flex justify-end gap-2 mb-8">
              <button
                onClick={() => router.push('/new/')}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md 
                  hover:bg-blue-600 transition-colors duration-200 flex items-center 
                  justify-center gap-2 shadow-sm hover:shadow-md"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" 
                    clipRule="evenodd" 
                  />
                </svg>
                새 프로젝트 추가
              </button>

              <button
                onClick={() => setIsCopyMode(!isCopyMode)}
                className={`px-4 py-2 text-sm ${isCopyMode ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} 
                  text-white rounded-md transition-colors duration-200 
                  flex items-center justify-center gap-2 shadow-sm hover:shadow-md`}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                </svg>
                {isCopyMode ? '복사 모드 종료' : '프로젝트 복사'}
              </button>
            </div>
          )}


          {/* 프로젝트 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 sm:gap-8 mt-8 mb-16">
            {currentProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => {
                  if (!isCopyMode) {
                    router.push(`/detail/${project.userId}/${project.id}`);  // URL 형식 변경
                  }
                }}
                className={`rounded-xl shadow-md hover:shadow-xl 
                  transition-all duration-300 ease-in-out transform hover:-translate-y-1
                  p-5 sm:p-7 ${!isCopyMode && 'cursor-pointer'}
                  ${project.status === '종료' 
                    ? `bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 
                       ${isCopyMode ? 'opacity-100' : 'opacity-60 dark:opacity-40 hover:opacity-90 dark:hover:opacity-70'}`
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
                          {project.totalEffort > 0 ? `${Number.isInteger(project.totalEffort) ? Math.floor(project.totalEffort) : project.totalEffort.toFixed(1)}m` : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {project.planning.name && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          기획: {project.planning.name} ({project.planning.effort}m)
                        </span>
                      )}
                      {project.design.name && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          디자인: {project.design.name} ({project.design.effort}m)
                        </span>
                      )}
                      {project.publishing.name && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          퍼블: {project.publishing.name} ({project.publishing.effort}m)
                        </span>
                      )}
                      {project.development.name && (
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          개발: {project.development.name} ({project.development.effort}m)
                        </span>
                      )}
                    </div>

                    {isCopyMode && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(project.id);
                          }}
                          className="px-4 py-2 text-sm bg-green-500 text-white rounded-md 
                            hover:bg-green-600 transition-colors duration-200 flex items-center 
                            justify-center gap-2 opacity-100"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-4 w-4" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                            <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                          </svg>
                          복사
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length > 0 && (
            <div className="mt-20 mb-16 flex justify-center items-center gap-2">
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
                  : '선택한 필터에 해당하는 로트 없습다.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 