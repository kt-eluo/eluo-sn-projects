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
          setProject({
            id: projectSnap.id,
            title: data.title || '제목 없음',
            description: data.description || '',
            status: data.status || '대기',
            startDate: data.startDate?.toDate().toLocaleDateString(),
            endDate: data.endDate?.toDate().toLocaleDateString(),
            team: data.team || [],
            availableHours: data.availableHours || 0,
            createAt: data.createAt?.toDate().toLocaleDateString(),
            updateAt: data.updateAt?.toDate().toLocaleDateString()
          })
        } else {
          setError('프로젝트를 찾을 수 없습니다.')
          console.error('프로젝트가 존재하지 않습니다')
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
      console.error('상태 업데이트 중 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // project state가 설정된 후 editedProject 초기화
  useEffect(() => {
    if (project) {
      setEditedProject({ ...project });
    }
  }, [project]);

  // 수정 저장 함수
  const handleSave = async () => {
    try {
      const db = getFirestore();
      const projectRef = doc(db, 'projects', user.uid, 'userProjects', id);
      
      // 변경된 필드만 업데이트하기 위해 project와 editedProject 비교
      const updates = {};
      if (project.title !== editedProject.title) updates.title = editedProject.title;
      if (project.status !== editedProject.status) updates.status = editedProject.status;
      if (project.availableHours !== editedProject.availableHours) 
        updates.availableHours = Number(editedProject.availableHours);
      if (project.description !== editedProject.description) 
        updates.description = editedProject.description;
      if (project.team.join(',') !== editedProject.team.join(',')) 
        updates.team = editedProject.team;
      
      // 날짜 처리
      if (editedProject.startDate !== project.startDate) {
        updates.startDate = new Date(editedProject.startDate);
      }
      if (editedProject.endDate !== project.endDate) {
        updates.endDate = new Date(editedProject.endDate);
      }

      if (Object.keys(updates).length > 0) {
        updates.updateAt = serverTimestamp();
        await updateDoc(projectRef, updates);
        setProject({ ...editedProject });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('프로젝트 업데이트 중 오류:', error);
      alert('프로젝트 수정 중 오류가 발생했습니다.');
    }
  };

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
            <div className="flex justify-between items-center mb-8 w-full gap-6">
              <div className="flex-1 min-w-0 max-w-4xl">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProject.title}
                    onChange={(e) => setEditedProject({...editedProject, title: e.target.value})}
                    className="text-2xl sm:text-3xl font-bold w-full
                      bg-gray-50 dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 
                      rounded-lg px-4 py-2.5
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-colors duration-200"
                    placeholder="프로젝트 제목을 입력하세요"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                    {project.title}
                  </h1>
                )}
              </div>
              
              {/* 진행 상태 */}
              <div className="flex-shrink-0">
                {isEditing ? (
                  <select
                    value={editedProject.status}
                    onChange={(e) => setEditedProject({...editedProject, status: e.target.value})}
                    className="px-4 py-2.5 rounded-lg 
                      bg-gray-50 dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600
                      text-sm font-medium
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-colors duration-200
                      min-w-[100px]"
                  >
                    <option value="대기">대기</option>
                    <option value="진행">진행</option>
                    <option value="종료">종료</option>
                  </select>
                ) : (
                  <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold
                    ${project.status === '진행' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                      : project.status === '대기' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}
                  >
                    {project.status}
                  </div>
                )}
              </div>
            </div>

            {/* 나머지 섹션들 */}
            <div className="space-y-8">
              {/* 가용 시간 */}
              <div className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-gray-600 dark:text-gray-300 font-medium">가용 시간</span>
                {isEditing ? (
                  <input
                    type="number"
                    value={editedProject.availableHours}
                    onChange={(e) => setEditedProject({...editedProject, availableHours: e.target.value})}
                    className="ml-4 px-3 py-1.5 w-24 
                      bg-white dark:bg-gray-600 
                      border border-gray-300 dark:border-gray-500 
                      rounded-lg
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-colors duration-200"
                  />
                ) : (
                  <span className="ml-4 text-xl font-bold text-gray-900 dark:text-white">
                    {project.availableHours}h
                  </span>
                )}
              </div>

              {/* 날짜 */}
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">시작일</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedProject.startDate}
                      onChange={(e) => setEditedProject({...editedProject, startDate: e.target.value})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-600 
                        border border-gray-300 dark:border-gray-500 rounded"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900 dark:text-white">{project.startDate}</p>
                  )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">종료일</p>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedProject.endDate}
                      onChange={(e) => setEditedProject({...editedProject, endDate: e.target.value})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-600 
                        border border-gray-300 dark:border-gray-500 rounded"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900 dark:text-white">{project.endDate}</p>
                  )}
                </div>
              </div>

              {/* 팀 구성원 */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">팀 구성원</h3>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {editedProject.team.map((member, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={member}
                          onChange={(e) => {
                            const newTeam = [...editedProject.team];
                            newTeam[index] = e.target.value;
                            setEditedProject({...editedProject, team: newTeam});
                          }}
                          className="px-2 py-1 bg-white dark:bg-gray-600 
                            border border-gray-300 dark:border-gray-500 rounded"
                        />
                        <button
                          onClick={() => {
                            const newTeam = editedProject.team.filter((_, i) => i !== index);
                            setEditedProject({...editedProject, team: newTeam});
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditedProject({
                        ...editedProject, 
                        team: [...editedProject.team, '']
                      })}
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      + 멤버 추가
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {project.team.map((member, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 
                          rounded-full text-sm border border-gray-200 dark:border-gray-500"
                      >
                        {member}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 프로젝트 설명 */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">프로젝트 설명</h3>
                {isEditing ? (
                  <textarea
                    value={editedProject.description}
                    onChange={(e) => setEditedProject({...editedProject, description: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-600 
                      border border-gray-300 dark:border-gray-500 rounded"
                    rows="4"
                  />
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500 dark:text-gray-400 mt-8">
                <p>생성일: {project.createAt}</p>
                <p>최종 수정일: {project.updateAt}</p>
              </div>

              {/* 목록으로 돌아가기 버튼과 수정/저장/취소 버튼 */}
              <div className="mt-8 flex justify-end gap-4">
                {isAdmin && (
                  <>
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-green-500 text-white text-sm font-medium
                            rounded-lg hover:bg-green-600
                            transition-colors duration-200"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditedProject({...project});
                          }}
                          className="px-4 py-2 bg-gray-500 text-white text-sm font-medium
                            rounded-lg hover:bg-gray-600
                            transition-colors duration-200"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-500 text-white text-sm font-medium
                          rounded-lg hover:bg-blue-600
                          transition-colors duration-200
                          flex items-center gap-1"
                      >
                        <span>수정</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => router.push('/main')}
                  className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                    transition-colors duration-200 text-sm sm:text-base font-medium"
                >
                  목록으로 돌아가기
                </button>
              </div>
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              댓글 ({comments.length})
            </h2>

            {/* 댓글 입력 폼 */}
            <form onSubmit={handleAddComment} className="mb-8">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  resize-none"
                rows="3"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className={`px-4 py-2 rounded-lg text-white
                    ${isSubmitting || !newComment.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                    } transition-colors`}
                >
                  {isSubmitting ? '등록 중...' : '댓글 등록'}
                </button>
              </div>
            </form>

            {/* 댓글 목록 */}
            {comments.map(comment => (
              <Comment
                key={comment.id}
                comment={comment}
                currentUser={user}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 상태 변경 모달 */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              프로젝트 상태 변경
            </h3>
            <div className="space-y-2">
              {['대기', '진행', '종료'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full p-2 rounded-md text-sm font-medium transition-colors
                    ${status === '진행' ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100' :
                      status === '대기' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100' :
                      'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100'}`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="w-full mt-4 p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200
                dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}