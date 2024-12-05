import DetailContent from './DetailContent'

// 'use client' 제거하고 async 함수로 변경
export default async function DetailPage({ params }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <DetailContent 
        userId={params.userId} 
        projectId={params.id} 
      />
    </div>
  )
}