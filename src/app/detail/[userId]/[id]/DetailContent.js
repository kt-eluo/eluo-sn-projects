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
  updateDoc,
  getDocs
} from 'firebase/firestore'

// 댓글 컴포넌트
const Comment = ({ comment, currentUser, onDelete, isAdmin }) => {
  // 삭제 권한 확인 (본인 댓글이거나 관리자인 경우)
  const canDelete = currentUser?.email === comment.userEmail || isAdmin;
  
  return (
    <div className="flex items-start justify-between p-4 bg-white dark:bg-gray-800 rounded-lg 
      border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 
      transition-all duration-200">
      <div className="flex-grow pr-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {comment.userEmail}
            </span>
            {comment.userEmail === currentUser?.email && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 
                dark:text-blue-200 rounded-full">
                내 댓글
              </span>
            )}
          </div>
          {/* 삭제 버튼 */}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="p-1.5 text-gray-500 hover:text-red-500 dark:text-gray-400 
                dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20
                transition-all duration-200 flex items-center gap-1"
              title={isAdmin ? "관리자 권한으로 삭제" : "삭제"}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                />
              </svg>
              <span className="text-xs">삭제</span>
            </button>
          )}
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-sm">
          {comment.content}
        </p>
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
          {formatDate(comment.createdAt)}
        </span>
      </div>
    </div>
  );
};

// 날짜 변환 함수 추가
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  if (timestamp instanceof Date) {
    return timestamp.toISOString().split('T')[0];
  }
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString().split('T')[0];
  }
  return '';
};

export default function DetailContent({ userId, projectId }) {
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
  const [isEditing, setIsEditing] = useState(false)
  const [editedProject, setEditedProject] = useState(null)

  // Firestore 초기화
  const db = getFirestore();

  // 관리자 상태 체크
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

  // 프로젝트 상세 정보 가져오기
  useEffect(() => {
    const fetchProjectDetail = async () => {
      if (!user) return;
      
      try {
        const db = getFirestore();
        const projectRef = doc(db, 'projects', userId, 'userProjects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
          const data = projectSnap.data();
          const totalEffort = 
            Number(data.planning?.effort || 0) +
            Number(data.design?.effort || 0) +
            Number(data.publishing?.effort || 0) +
            Number(data.development?.effort || 0);

          const projectData = {
            id: projectId,
            ownerId: userId,
            title: data.title || '',
            status: data.status || '대기',
            totalEffort: totalEffort > 0 ? Number(totalEffort.toFixed(1)) : null,
            requestDate: data.requestDate || null,
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            description: data.description || '',
            planning: {
              name: data.planning?.name || '',
              effort: data.planning?.effort || null
            },
            design: {
              name: data.design?.name || '',
              effort: data.design?.effort || null
            },
            publishing: {
              name: data.publishing?.name || '',
              effort: data.publishing?.effort || null
            },
            development: {
              name: data.development?.name || '',
              effort: data.development?.effort || null
            },
            createAt: data.createAt || null,
            updateAt: data.updateAt || null
          };

          setProject(projectData);
          setEditedProject(projectData);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('프로젝트 정보 가져오기 오류:', error);
        setError('프로젝트 정보를 가져오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading) {
      if (!user) {
        router.push('/');
      } else {
        fetchProjectDetail();
      }
    }
  }, [user, loading, userId, projectId, router]);

  // 댓글 가져오기
  useEffect(() => {
    if (!user || !projectId || !userId) return;

    const commentsRef = collection(db, 'projects', userId, 'userProjects', projectId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [user, userId, projectId]);

  // 댓글 추가
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 댓글 추가
      const commentData = {
        content: newComment.trim(),
        userEmail: user.email,
        createdAt: serverTimestamp(),
      };

      const commentsRef = collection(db, 'projects', userId, 'userProjects', projectId, 'comments');
      await addDoc(commentsRef, commentData);

      // 댓글 목록 업데이트
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const updatedComments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setComments(updatedComments);
      setNewComment('');
    } catch (error) {
      console.error('댓글 작성 중 오류 발생:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId) => {
    if (!user) return;

    const confirmDelete = window.confirm('댓글을 삭제하시겠습니까?');
    if (!confirmDelete) return;

    try {
      const commentRef = doc(db, 'projects', userId, 'userProjects', projectId, 'comments', commentId);
      const commentDoc = await getDoc(commentRef);
      
      if (!commentDoc.exists()) {
        alert('댓글을 찾을 수 없습니다.');
        return;
      }

      if (commentDoc.data().userEmail === user.email || isAdmin) {
        await deleteDoc(commentRef);
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      } else {
        alert('삭제 권한이 없습니다.');
      }
    } catch (error) {
      console.error('댓글 삭제 중 오류 발생:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 프로젝트 삭제
  const handleDelete = async () => {
    if (!window.confirm('프로젝트를 삭제하시겠습니까?')) return;

    try {
      const db = getFirestore();
      const projectRef = doc(db, 'projects', userId, 'userProjects', projectId);
      await deleteDoc(projectRef);
      router.push('/main');
    } catch (error) {
      console.error('프로젝트 삭제 중 오류:', error);
    }
  };

  // 프로젝트 수정
  const handleSave = async () => {
    if (!editedProject) return;

    try {
      const db = getFirestore();
      const projectRef = doc(db, 'projects', userId, 'userProjects', projectId);
      
      await updateDoc(projectRef, {
        ...editedProject,
        updateAt: serverTimestamp()
      });

      setProject(editedProject);
      setIsEditing(false);
    } catch (error) {
      console.error('프로젝트 수정 중 오류:', error);
    }
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div>에러: {error}</div>;
  }

  if (!project) {
    return <div>프로젝트를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 메인 컨텐츠 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {/* 프로젝트 헤더 */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedProject.title}
                    onChange={(e) => setEditedProject({...editedProject, title: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 
                      text-white placeholder-white/60 focus:ring-2 focus:ring-white/50"
                    placeholder="프로젝트 제목"
                  />
                ) : (
                  project.title
                )}
              </h1>
              <div className={`px-4 py-1.5 rounded-full text-sm font-medium
                ${project.status === '진행' 
                  ? 'bg-green-100 text-green-800' 
                  : project.status === '대기' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'}`}
              >
                {project.status}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* 날짜 및 공수 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">현업요청일</div>
                {isEditing ? (
                  <input
                    type="date"
                    value={formatDate(editedProject.requestDate)}
                    onChange={(e) => setEditedProject({...editedProject, requestDate: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                ) : (
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDate(project.requestDate)}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">시작일</div>
                {isEditing ? (
                  <input
                    type="date"
                    value={formatDate(editedProject.startDate)}
                    onChange={(e) => setEditedProject({...editedProject, startDate: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                ) : (
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDate(project.startDate)}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">종료일</div>
                {isEditing ? (
                  <input
                    type="date"
                    value={formatDate(editedProject.endDate)}
                    onChange={(e) => setEditedProject({...editedProject, endDate: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-700 
                      border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                ) : (
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDate(project.endDate)}
                  </div>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">총 공수</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {project.totalEffort}m
                </div>
              </div>
            </div>

            {/* 담당자 정보 - 전체 너비로 변경 */}
            <div className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">담당자 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 기획 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    기획
                  </label>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={editedProject.planning.name}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          planning: { ...editedProject.planning, name: e.target.value }
                        })}
                        className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        placeholder="담당자 이름"
                      />
                      <input
                        type="text"
                        value={editedProject.planning.effort ?? ''}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          planning: { ...editedProject.planning, effort: e.target.value }
                        })}
                        className="w-28 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        placeholder="공수(m)"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {project.planning.name}
                      </span>
                      {project.planning.effort !== null && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({project.planning.effort}m)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* 디자인 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    디자인
                  </label>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={editedProject.design.name}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          design: { ...editedProject.design, name: e.target.value }
                        })}
                        className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        placeholder="담당자 이름"
                      />
                      <input
                        type="text"
                        value={editedProject.design.effort ?? ''}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          design: { ...editedProject.design, effort: e.target.value }
                        })}
                        className="w-28 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        placeholder="공수(m)"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-600 dark:text-purple-400 font-medium">
                        {project.design.name}
                      </span>
                      {project.design.effort !== null && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({project.design.effort}m)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* 퍼블리싱 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    퍼블리싱
                  </label>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={editedProject.publishing.name}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          publishing: { ...editedProject.publishing, name: e.target.value }
                        })}
                        className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        placeholder="담당자 이름"
                      />
                      <input
                        type="text"
                        value={editedProject.publishing.effort ?? ''}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          publishing: { ...editedProject.publishing, effort: e.target.value }
                        })}
                        className="w-28 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        placeholder="공수(m)"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {project.publishing.name}
                      </span>
                      {project.publishing.effort !== null && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({project.publishing.effort}m)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* 개발 */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    개발
                  </label>
                  {isEditing ? (
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={editedProject.development.name}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          development: { ...editedProject.development, name: e.target.value }
                        })}
                        className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        placeholder="담당자 이름"
                      />
                      <input
                        type="text"
                        value={editedProject.development.effort ?? ''}
                        onChange={(e) => setEditedProject({
                          ...editedProject,
                          development: { ...editedProject.development, effort: e.target.value }
                        })}
                        className="w-28 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                          border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                        placeholder="공수(m)"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        {project.development.name}
                      </span>
                      {project.development.effort !== null && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({project.development.effort}m)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 프로젝트 설명 - 아래로 이동 */}
            <div className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">프로젝트 설명</h3>
              {isEditing ? (
                <textarea
                  value={editedProject.description}
                  onChange={(e) => setEditedProject({...editedProject, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-700 
                    border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  rows="8"
                  placeholder="프로젝트 설명을 입력하세요"
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {project.description}
                </p>
              )}
            </div>

            {/* 댓글 섹션 */}
            {!isEditing && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  댓글 
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({comments.length}개)
                  </span>
                </h3>
                
                {/* 댓글 작성 폼 */}
                <form onSubmit={handleAddComment} className="mb-6">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="댓글 입력하세요"
                      className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 
                        border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white
                        focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                        dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !newComment.trim()}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                        transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? '작성 중...' : '작성'}
                    </button>
                  </div>
                </form>

                {/* 댓글 목록 */}
                <div className="space-y-3">
                  {comments.map(comment => (
                    <Comment
                      key={comment.id}
                      comment={comment}
                      currentUser={user}
                      onDelete={handleDeleteComment}
                      isAdmin={isAdmin}
                    />
                  ))}
                  
                  {comments.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      아직 작성된 댓글이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 버튼 영역 */}
            <div className="flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                      transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditedProject(project)
                    }}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 
                      transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                          transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 
                          transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        삭제
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => router.push('/main')}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 
                      transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    목록으로
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}