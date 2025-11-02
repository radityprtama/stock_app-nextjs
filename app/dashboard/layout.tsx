import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { prisma } from '@/lib/prisma'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/auth/login')
  }

  // Check if user is approved and active
  const user = await prisma?.user.findUnique({
    where: { id: session.user.id },
    select: { approved: true, aktif: true, role: true }
  })

  if (!user?.approved || !user?.aktif) {
    redirect('/auth/login?message=account_inactive')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar user={session.user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={session.user} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}