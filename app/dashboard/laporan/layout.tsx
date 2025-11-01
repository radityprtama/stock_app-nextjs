import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LaporanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {children}
    </div>
  )
}