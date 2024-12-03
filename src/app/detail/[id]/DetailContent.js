'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { Header } from '@/components/Header'
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore'

// 댓글 컴포넌트
const Comment = ({ comment, currentUser, onDelete }) => {
  const isAuthor = currentUser?.uid === comment.userId

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-medium text-gray-900 dark:text-white">
            {comment.userName}
          </span>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {comment.createdAt?.toDate().toLocaleString()}
          </span>
        </div>
        {isAuthor && (
          <button
            onClick={() => onDelete(comment.id)}
            className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
          >
            삭제
          </button>
        )}
      </div>
      <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
        {comment.content}
      </p>
    </div>
  )
}

export default function DetailContent({ id }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { darkMode } = useTheme()
  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState(null);

  useEffect(() => {
    const fetchProjectDetail = async () => {
      if (!user) return
      
      try {
        const db = getFirestore()
        const projectRef = doc(db, 'projects', user.uid, 'userProjects', id)
        const projectSnap = await getDoc(projectRef)

        if (projectSnap.exists()) {
          const data = projectSnap.data()
          const totalEffort = 
            Number(data.planning?.effort || 0) +
            Number(data.design?.effort || 0) +
            Number(data.publishing?.effort || 0) +
            Number(data.development?.effort || 0);

          const projectData = {
            id: projectSnap.id,
            title: data.title || '제목 없음',
            totalEffort: totalEffort,
            status: data.status || '대기',
            requestDate: data.requestDate?.toDate().toLocaleDateString(),
            startDate: data.startDate?.toDate().toLocaleDateString(),
            endDate: data.endDate?.toDate().toLocaleDateString(),
            planning: {
              name: data.planning?.name || '',
              effort: data.planning?.effort || 0
            },
            design: {
              name: data.design?.name || '',
              effort: data.design?.effort || 0
            },
            publishing: {
              name: data.publishing?.name || '',
              effort: data.publishing?.effort || 0
            },
            development: {
              name: data.development?.name || '',
              effort: data.development?.effort || 0
            },
            description: data.description || '',
            createAt: data.createAt?.toDate().toLocaleDateString(),
            updateAt: data.updateAt?.toDate().toLocaleDateString()
          }

          setProject(projectData)
          setEditedProject(projectData)
        } else {
          setError('프로젝트를 찾을 수 없습니다.')
        }
      } catch (error) {
        setError('프로젝트 로딩 중 오류가 발생했습니다.')
        console.error('Error fetching project:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!loading) {
      if (!user) {
        router.push('/')
      } else {
        fetchProjectDetail()
      }
    }
  }, [user, loading, id, router])

  // 댓글 실시간 업데이트 구독
  useEffect(() => {
    if (!user) return

    const db = getFirestore()
    const commentsRef = collection(db, 'projects', user.uid, 'userProjects', id, 'comments')
    const q = query(commentsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setComments(commentsData)
    })

    return () => unsubscribe()
  }, [user, id])

  // 댓글 추가
  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const db = getFirestore()
      const commentsRef = collection(db, 'projects', user.uid, 'userProjects', id, 'comments')
      
      await addDoc(commentsRef, {
        content: newComment,
        userId: user.uid,
        userName: user.email,
        createdAt: serverTimestamp()
      })

      setNewComment('')
    } catch (error) {
      console.error('댓글 추가 중 오류:', error)
      alert('댓글을 추가하는 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 댓글 삭제
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return

    try {
      const db = getFirestore()
      const commentRef = doc(db, 'projects', user.uid, 'userProjects', id, 'comments', commentId)
      await deleteDoc(commentRef)
    } catch (error) {
      console.error('댓글 삭제 중 오류:', error)
      alert('댓글을 삭제하는 중 오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin');
      } catch (error) {
        console.error('관리자 권한 확인 중 오류:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const handleStatusChange = async (newStatus) => {
    try {
      const db = getFirestore();
      const projectRef = doc(db, 'projects', user.uid, 'userProjects', id);
      await updateDoc(projectRef, {
        status: newStatus,
        updateAt: serverTimestamp()
      });
      
      setProject(prev => ({
        ...prev,
        status: newStatus
      }));
      setIsStatusModalOpen(false);
    } catch (error) {
      console.error('상태 업데이트  오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // project state가 설정된 후 editedProject 초기화
  useEffect(() => {
    if (project) {
      setEditedProject({ ...project });
    }
  }, [project]);

  // useEffect 추가 - 각 파트의 effort가 변경될 때마다 totalEffort 자동 계산
  useEffect(() => {
    if (editedProject) {
      const total = 
        Number(editedProject.planning?.effort || 0) +
        Number(editedProject.design?.effort || 0) +
        Number(editedProject.publishing?.effort || 0) +
        Number(editedProject.development?.effort || 0);
      
      setEditedProject(prev => ({
        ...prev,
        totalEffort: total
      }));
    }
  }, [
    editedProject?.planning?.effort,
    editedProject?.design?.effort,
    editedProject?.publishing?.effort,
    editedProject?.development?.effort
  ]);

  // 수정 저장 함수
  const handleSave = async () => {
    try {
      const db = getFirestore()
      const projectRef = doc(db, 'projects', user.uid, 'userProjects', id)
      
      const updates = {
        title: editedProject.title,
        status: editedProject.status,
        description: editedProject.description,
        planning: {
          name: editedProject.planning.name,
          effort: Number(editedProject.planning.effort)
        },
        design: {
          name: editedProject.design.name,
          effort: Number(editedProject.design.effort)
        },
        publishing: {
          name: editedProject.publishing.name,
          effort: Number(editedProject.publishing.effort)
        },
        development: {
          name: editedProject.development.name,
          effort: Number(editedProject.development.effort)
        },
        updateAt: serverTimestamp()
      }

      // 날짜 필드가 변경된 경우에만 업데이트
      if (editedProject.startDate !== project.startDate) {
        updates.startDate = new Date(editedProject.startDate)
      }
      if (editedProject.endDate !== project.endDate) {
        updates.endDate = new Date(editedProject.endDate)
      }
      if (editedProject.requestDate !== project.requestDate) {
        updates.requestDate = new Date(editedProject.requestDate)
      }

      await updateDoc(projectRef, updates)
      setProject(editedProject)
      setIsEditing(false)
    } catch (error) {
      console.error('프로젝트 업데이트 중 오류:', error)
      alert('프로젝트 수정 중 오류가 발생했습니다.')
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.push('/main')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          메인으로 돌아가기
        </button>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 mb-8">
            {/* 타이틀과 상태 영역 */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProject.title}
                    onChange={(e) => setEditedProject({...editedProject, title: e.target.value})}
                    className="text-2xl font-bold w-full bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2"
                    placeholder="프로젝트 제목을 입력하세요"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {project.title}
                  </h1>
                )}
              </div>
              
              {/* 진행 상태 */}
              <div className="ml-4">
                {isEditing ? (
                  <select
                    value={editedProject.status}
                    onChange={(e) => setEditedProject({...editedProject, status: e.target.value})}
                    className="px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700"
                  >
                    <option value="대기">대기</option>
                    <option value="진행">진행</option>
                    <option value="종료">종료</option>
                  </select>
                ) : (
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold
                    ${project.status === '진행' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                      : project.status === '대기' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'}`}
                  >
                    {project.status}
                  </span>
                )}
              </div>
            </div>

            {/* 날짜 정보 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">현업요청일</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedProject.requestDate}
                    onChange={(e) => setEditedProject({...editedProject, requestDate: e.target.value})}
                    className="w-full px-2 py-1 bg-white dark:bg-gray-600 rounded"
                  />
                ) : (
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {project.requestDate}
                  </p>
                )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">시작일</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedProject.startDate}
                    onChange={(e) => setEditedProject({...editedProject, startDate: e.target.value})}
                    className="w-full px-2 py-1 bg-white dark:bg-gray-600 rounded"
                  />
                ) : (
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {project.startDate}
                  </p>
                )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">종료일</p>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedProject.endDate}
                    onChange={(e) => setEditedProject({...editedProject, endDate: e.target.value})}
                    className="w-full px-2 py-1 bg-white dark:bg-gray-600 rounded"
                  />
                ) : (
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {project.endDate}
                  </p>
                )}
              </div>
            </div>

            {/* 공수 정보 */}
            <div className="mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">전체 공수</h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {project.totalEffort}h
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 기획 */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">기획</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedProject.planning.name}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          planning: { ...editedProject.planning, name: e.target.value }
                        })}
                        className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-white"
                        placeholder="담당자명"
                      />
                      <input
                        type="number"
                        value={editedProject.planning.effort}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          planning: { ...editedProject.planning, effort: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-white"
                        placeholder="공수 (시간)"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-blue-800 dark:text-blue-200">
                        {project.planning.name} ({project.planning.effort}h)
                      </p>
                    </div>
                  )}
                </div>

                {/* 디자인 */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">디자인</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedProject.design.name}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          design: { ...editedProject.design, name: e.target.value }
                        })}
                        className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-white"
                        placeholder="담당자명"
                      />
                      <input
                        type="number"
                        value={editedProject.design.effort}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          design: { ...editedProject.design, effort: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-white"
                        placeholder="공수 (시간)"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-purple-800 dark:text-purple-200">
                        {project.design.name} ({project.design.effort}h)
                      </p>
                    </div>
                  )}
                </div>

                {/* 퍼블리싱 */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">퍼블리싱</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedProject.publishing.name}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          publishing: { ...editedProject.publishing, name: e.target.value }
                        })}
                        className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-white"
                        placeholder="담당자명"
                      />
                      <input
                        type="number"
                        value={editedProject.publishing.effort}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          publishing: { ...editedProject.publishing, effort: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-white"
                        placeholder="공수 (시간)"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-green-800 dark:text-green-200">
                        {project.publishing.name} ({project.publishing.effort}h)
                      </p>
                    </div>
                  )}
                </div>

                {/* 개발 */}
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">개발</h4>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editedProject.development.name}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          development: { ...editedProject.development, name: e.target.value }
                        })}
                        className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-white"
                        placeholder="담당자명"
                      />
                      <input
                        type="number"
                        value={editedProject.development.effort}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          development: { ...editedProject.development, effort: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 rounded bg-gray-50 dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 
                          text-gray-900 dark:text-white"
                        placeholder="공수 (시간)"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-orange-800 dark:text-orange-200">
                        {project.development.name} ({project.development.effort}h)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 프로젝트 설명 */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">프로젝트 설명</h3>
              {isEditing ? (
                <textarea
                  value={editedProject.description}
                  onChange={(e) => setEditedProject({...editedProject, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  rows="4"
                  placeholder="프로젝트 설명을 입력하세요"
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {project.description}
                </p>
              )}
            </div>

            {/* 버글 섹션 */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">댓글</h3>
              
              {/* 댓글 목록 */}
              <div className="space-y-4 mb-6">
                {(comments || []).map(comment => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{comment.userName}</p>
                        <p className="text-gray-900 dark:text-white mt-1">{comment.content}</p>
                      </div>
                      {(user?.uid === comment.userId || isAdmin) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {comment.createdAt?.toDate().toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* 댓글 입력 폼 - 수정된 레이아웃 */}
              <form onSubmit={handleAddComment} className="flex gap-4">
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-4 py-5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    rows="1"
                    placeholder="댓글을 입력하세요..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className={`px-6 py-5 rounded-lg text-white whitespace-nowrap self-start
                    ${isSubmitting || !newComment.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                >
                  {isSubmitting ? '등록 중...' : '댓글 등록'}
                </button>
              </form>
            </div>

            {/* 버튼 영역 */}
            <div className="flex justify-end gap-4">
              {isAdmin && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedProject({...project});
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      수정
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => router.push('/main')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                목록으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}