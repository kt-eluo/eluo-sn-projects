'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { Header } from '@/components/Header'
import { getFirestore, collection, getDocs, query, orderBy, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isCopyMode, setIsCopyMode] = useState(false);

  // 현재 날짜 관련 변수들
  const today = new Date()
  const currentYear = today.getFullYear().toString()
  const currentMonth = today.getMonth() + 1

  // 상태 관리
  const [yearFilter, setYearFilter] = useState(currentYear)
  const [selectedMonths, setSelectedMonths] = useState([currentMonth])
  const [isAllMonthsSelected, setIsAllMonthsSelected] = useState(false)
  const [displayYear, setDisplayYear] = useState(Number(currentYear))
  const [displayMonth, setDisplayMonth] = useState(currentMonth)

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
      
      // 모든 용자의 프로젝트를 ��오기  users 컬렉션을 먼저 조회
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

  // 날짜 필터링 함수 수정
  const getFilteredProjects = (projects) => {
    let filtered = projects;

    // 검색어 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 커스텀 날짜 범위 필터링
    if (startDate && endDate) {
      filtered = filtered.filter(project => {
        const projectEndDate = project.endDate?.toDate();
        if (!projectEndDate) return false;
        
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        return projectEndDate >= start && projectEndDate <= end;
      });
    } else {
      // 년도 필터 적용
      filtered = filtered.filter(project => {
        const endDate = project.endDate?.toDate();
        if (!endDate) return false;
        
        const projectYear = endDate.getFullYear().toString();
        return yearFilter === projectYear;
      });

      // 월별 필터 적용 - selectedMonths가 비어있으면 모든 월 표시
      if (selectedMonths.length > 0) {
        filtered = filtered.filter(project => {
          const endDate = project.endDate?.toDate();
          if (!endDate) return false;
          
          const projectMonth = endDate.getMonth() + 1;
          return selectedMonths.includes(projectMonth);
        });
      }
    }

    // 상태 필터 적용
    filtered = filtered.filter(project => 
      statusFilter === '전체' || project.status === statusFilter
    );

    return filtered.sort((a, b) => {
      const dateA = a.startDate?.toDate() || new Date(0);
      const dateB = b.startDate?.toDate() || new Date(0);
      return dateB - dateA;
    });
  };

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
      setYearFilter(currentYear);
      setSelectedMonths([currentMonth]);
      setIsAllMonthsSelected(false);
      setCurrentPage(1);
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 전체 공수 계산 함수 수정
  const calculateTotalEffort = (projects) => {
    if (!Array.isArray(projects)) return 0

    const total = projects.reduce((total, project) => {
      const planningEffort = Number(project.planning?.effort || 0)
      const designEffort = Number(project.design?.effort || 0)
      const publishingEffort = Number(project.publishing?.effort || 0)
      
      return total + planningEffort + designEffort + publishingEffort
    }, 0)

    // 소수점 3째자리에서 반올림하여 2째자리까지 표시
    return Number(total.toFixed(2))
  }

  // 월 필터 핸들러 수정
  const handleMonthFilterChange = (month) => {
    if (month === '전체') {
      if (isAllMonthsSelected) {
        // 전체가 선택된 상태에서 클릭하면 12월만 선택
        setSelectedMonths([12]);
        setIsAllMonthsSelected(false);
      } else {
        // 전체가 선택되지 않은 상태에서 클릭하면 모두 선택
        setSelectedMonths([1,2,3,4,5,6,7,8,9,10,11,12]);
        setIsAllMonthsSelected(true);
      }
    } else {
      // 개별 월 선택 시
      setSelectedMonths(prev => {
        let newSelection;
        if (prev.includes(month)) {
          // 이미 선택된 월 클릭 시 해제하되, 모든 월이 해제되면 12월 선택
          newSelection = prev.filter(m => m !== month);
          if (newSelection.length === 0) {
            newSelection = [12];
          }
        } else {
          // 새로운 월 선택 시 추가
          newSelection = [...prev, month].sort((a, b) => a - b);
        }
        
        // 전체 선택 상태 업데이트
        setIsAllMonthsSelected(newSelection.length === 12);
        
        return newSelection;
      });
    }
    setCurrentPage(1);
  };

  // 공수를 일수로 변환하는 함수 수정
  const convertEffortToDay = (effort) => {
    if (effort === '-' || !effort) return '-'
    
    // 1.0이 2일이 되도록 수정
    const days = effort * 2
    
    // 소수점이 없으면 정수로, 있으면 소수점 1자리까지 표시
    return days > 0 ? `${Number.isInteger(days) ? Math.floor(days) : days.toFixed(1)}일` : '-'
  }

  // 복사 함수 수
  const handleCopy = async (projectId, originalUserId) => {
    console.log("복사 시작:", projectId, originalUserId, user.uid); // 디버깅용

    if (!user?.uid) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      const db = getFirestore();
      
      // 1. 원본 프로젝트 데이터 가져오기 (원래 소유자의 경로에서)
      const originalProjectRef = doc(db, 'projects', originalUserId, 'userProjects', projectId);
      const originalProjectSnap = await getDoc(originalProjectRef);

      console.log("프로젝트 스냅샷:", originalProjectSnap.exists(), originalProjectSnap.data()); // 디버깅용

      if (!originalProjectSnap.exists()) {
        console.error('프로젝트를 찾을 수 없음:', projectId);
        alert('프로젝트를 찾을 수 없습니다.');
        return;
      }

      // 2. 새 프로젝트 데이터 준비
      const originalData = originalProjectSnap.data();
      const newProjectData = {
        ...originalData,
        title: `${originalData.title} (복사본)`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        userId: user.uid,  // 현재 사용자의 uid로 설정
      };

      delete newProjectData.id; // id 제거

      // 3. 새 프로젝트 추가 (현재 사용자의 로에)
      const userProjectsRef = collection(db, 'projects', user.uid, 'userProjects');
      const docRef = await addDoc(userProjectsRef, newProjectData);

      console.log("프로젝트 복사 료:", docRef.id); // 디버깅용
      
      // 4. 성공 메시지 표시 및 복사 모드 종료
      alert('프로젝트가 성공적으로 복사되었습니다.');
      setIsCopyMode(false);
      
      // 5. 프로젝트 목록 새로고침
      fetchUserProjects(user.uid);

    } catch (error) {
      console.error('프로젝트 복사 중 오류 발생:', error);
      alert('프로젝트 복사 중 오류가 발생했습니다.');
    }
  };

  // 복사 버튼 클릭 핸들러 수정
  const handleCopyClick = (e, projectId, userId) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("복사 버튼 클릭:", projectId, userId); // 디버깅
    if (!projectId) {
      console.error('프로젝트 ID가 없습니다.');
      return;
    }
    handleCopy(projectId, userId);
  };

  // DatePicker 상태가 설정었는지 확인하는 함
  const isDateRangeActive = startDate !== null || endDate !== null;

  // 필터 초기화 함수 수정
  const handleResetFilters = () => {
    setYearFilter(currentYear);
    setStatusFilter('전체');
    setSelectedMonths([currentMonth]);
    setIsAllMonthsSelected(false);
    setCustomDateRange([null, null]);
    setCurrentPage(1);
  };

  // 년도 필터 변경 핸들러 수정
  const handleYearFilterChange = (year) => {
    setYearFilter(year);
    setDisplayYear(Number(year)); // 년 표시 업데이트
    setCurrentPage(1);
  };

  // 초기 상태 설정
  useEffect(() => {
    // 초기 로딩 시 현재 월 선택
    setSelectedMonths([currentMonth]);
    setYearFilter(currentYear);
    setIsAllMonthsSelected(false);
  }, []); // 빈 의존성 배열로 초기 로딩 시에만 실행

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
        <div className="max-w-8xl mx-auto">
          <div className="flex flex-col gap-16">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 타이틀 영역 - 3칸 차지 (왼쪽 패딩 제거) */}
              <div className="lg:col-span-3 flex flex-col gap-2 pl-0">
                <h2 className="flex flex-col sm:flex-row sm:items-center text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {yearFilter}년 {' '}
                  {selectedMonths.length === 1 
                    ? `${selectedMonths[0]}월`
                    : selectedMonths.length === 0 
                      ? `${currentMonth}월`
                      : selectedMonths.length === 12
                        ? '전체'
                        : `${selectedMonths.join(', ')}월`
                  }
                  <span className="mt-2 sm:mt-0 sm:ml-2 text-lg sm:text-xl text-blue-500 dark:text-blue-400 font-semibold">
                    ({selectedMonths.length === 1 
                      ? `${selectedMonths[0]}월` 
                      : selectedMonths.length === 0 
                        ? `${currentMonth}월`
                        : selectedMonths.length === 12
                          ? '전체'
                          : `${selectedMonths.join(', ')}월`} 공수 {calculateTotalEffort()}m / {convertEffortToDay(calculateTotalEffort())}일)
                  </span>
                </h2>

                <h1 className="text-lg text-gray-700 dark:text-gray-300">
                  전체 프로젝트 목록
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    (총 {filteredProjects.length}개)
                  </span>
                </h1>

              </div>

              {/* 필터 옵션 영역 - 1칸 차지 (오른쪽 패딩 제거) */}
              <div className="lg:col-span-1 pr-0">
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      필터 옵션
                    </h3>
                    <button
                      onClick={handleResetFilters}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                        bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                        hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                        focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-3.5 w-3.5" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v4a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      필터 초기화
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="w-full">
                      <select
                        value={yearFilter}
                        onChange={(e) => handleYearFilterChange(e.target.value)}
                        disabled={isDateRangeActive}
                        className={`w-full px-4 py-2 text-sm rounded-md
                          border border-gray-300 dark:border-gray-600 
                          focus:ring-2 focus:ring-blue-500
                          ${isDateRangeActive 
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50' 
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                      >
                        <option value="2025">2025년</option>
                        <option value="2024">2024년</option>
                        <option value="2023">2023년</option>
                      </select>
                    </div>

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

                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex gap-1.5 w-full">
                        {[1, 2, 3, 4, 5, 6].map((month) => (
                          <button
                            key={month}
                            onClick={() => handleMonthFilterChange(month)}
                            disabled={isDateRangeActive}
                            className={`px-2 py-1 text-xs rounded-md transition-all
                              w-[calc(100%/6)]
                              ${isDateRangeActive
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                                : selectedMonths.includes(month)
                                  ? 'bg-green-500 text-white shadow-sm'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                          >
                            {month}월
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex gap-1.5 w-full">
                        {[7, 8, 9, 10, 11, 12].map((month) => (
                          <button
                            key={month}
                            onClick={() => handleMonthFilterChange(month)}
                            disabled={isDateRangeActive}
                            className={`px-2 py-1 text-xs rounded-md transition-all
                              w-[calc(100%/6)]
                              ${isDateRangeActive
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                                : selectedMonths.includes(month)
                                  ? 'bg-green-500 text-white shadow-sm'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                          >
                            {month}월
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex w-full">
                        <button
                          onClick={() => handleMonthFilterChange('전체')}
                          disabled={isDateRangeActive}
                          className={`px-2 py-1 text-xs rounded-md transition-all
                            w-full
                            ${isDateRangeActive
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50'
                              : isAllMonthsSelected
                                ? 'bg-green-500 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                          전체
                        </button>
                      </div>
                    </div>

                    <div className="w-full flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-md">
                      <DatePicker
                        selected={startDate}
                        onChange={(date) => {
                          handleDateRangeChange([date, endDate]);
                          // 날짜 범위 선택 시 년도와 월 필터 초기화
                          if (date) {
                            setYearFilter('2024');
                            setSelectedMonths([currentMonth]);
                            setIsAllMonthsSelected(false);
                          }
                        }}
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
                        onChange={(date) => {
                          handleDateRangeChange([startDate, date]);
                          // 날짜 범위 선택 시 년도와 월 필터 초기화
                          if (date) {
                            setYearFilter('2024');
                            setSelectedMonths([currentMonth]);
                            setIsAllMonthsSelected(false);
                          }
                        }}
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
            </div>

            {/* 검색 및 버튼 영역 */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 검색창 영역 - 3칸 차지 (왼쪽 패딩 제거) */}
              <div className="lg:col-span-3 relative pl-0">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="프로젝트 검색..."
                  className="w-full px-4 py-2.5 pr-10 text-sm rounded-lg
                    bg-white dark:bg-gray-700 
                    border border-gray-300 dark:border-gray-600
                    text-gray-900 dark:text-white
                    placeholder-gray-500 dark:placeholder-gray-400
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    shadow-sm hover:shadow transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* 버튼 영역 - 1칸 차지 (오른쪽 패딩 제거) */}
              <div className="lg:col-span-1 grid grid-cols-2 gap-3 pr-0">
                <button 
                  onClick={() => router.push('/new')}  // 프로젝트 추가 페이지로 이동
                  className="px-4 py-2.5 text-sm font-medium bg-blue-500 text-white rounded-lg
                    hover:bg-blue-600 active:bg-blue-700
                    transition-all duration-200
                    flex items-center justify-center gap-2
                    shadow-sm hover:shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  프로젝트 추가
                </button>
                <button 
                  onClick={() => {
                    console.log("복사 모드 토"); // 디버깅용
                    setIsCopyMode(!isCopyMode);
                  }}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg
                    transition-all duration-200
                    flex items-center justify-center gap-2
                    shadow-sm hover:shadow-md
                    ${isCopyMode 
                      ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white' 
                      : 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                    <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                  </svg>
                  {isCopyMode ? '복사 취소' : '프로젝트 복사'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentProjects.map((project, index) => (
              <div
                key={`${project.id}-${index}`}
                onClick={() => {
                  if (!isCopyMode) {
                    router.push(`/detail/${project.userId}/${project.id}`);
                  }
                }}
                className={`rounded-lg shadow-sm hover:shadow-md 
                  transition-all duration-200 transform hover:-translate-y-1
                  p-5 ${!isCopyMode && 'cursor-pointer'}
                  ${project.status === '종료' 
                    ? `bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 
                       ${isCopyMode ? 'opacity-100' : 'opacity-60 dark:opacity-40 hover:opacity-90 dark:hover:opacity-70'}`
                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 opacity-100'
                  }
                  ${project.status === '대기'
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
                        style={{ wordBreak: 'keep-all' }}
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
                  </div>

                  <div className="mt-auto">
                    <div className="mb-4 space-y-2">
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">현업요청:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {project.requestDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">TF요청일:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {project.startDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">완료예정일:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {project.endDate?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">실 완료일:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {project.completionDate?.toDate().toLocaleDateString() || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">전체 공수:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {`${Number(project.planning?.effort || 0) + 
                             Number(project.design?.effort || 0) + 
                             Number(project.publishing?.effort || 0)}m`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
                      {project.planning.name && (
                        <span className="block w-full px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-center">
                          기획 {project.planning.name} {project.planning.effort}m
                        </span>
                      )}
                      {project.design.name && (
                        <span className="block w-full px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-center">
                          디자인 {project.design.name} {project.design.effort}m
                        </span>
                      )}
                      {project.publishing.name && (
                        <span className="block w-full px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-center">
                          퍼블 {project.publishing.name} {project.publishing.effort}m
                        </span>
                      )}
                      {project.development.name && (
                        <span className="block w-full px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-center">
                          개발 {project.development.name} {project.development.effort}m
                        </span>
                      )}
                    </div>

                    {isCopyMode && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={(e) => handleCopyClick(e, project.id, project.userId)}
                          className="px-4 py-2 text-sm bg-green-500 text-white rounded-md 
                            hover:bg-green-600 active:bg-green-700 
                            transition-colors duration-200 
                            flex items-center justify-center gap-2"
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
                          복사하기
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
                  ? '등록된 로젝트��� 없습니다.' 
                  : '선택한 필터에 해당하는 로트 없습다.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 