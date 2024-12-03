import DetailContent from './DetailContent'

export default async function DetailPage({ params }) {
  const id = await Promise.resolve(params.id)
  return <DetailContent id={id} />
}