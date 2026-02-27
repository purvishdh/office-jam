import GroupRoom from './GroupRoom'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ name?: string }>
}

export default async function GroupPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { name } = await searchParams
  return <GroupRoom groupId={id} nameParam={name} />
}
