import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/layout/header'
import { prisma } from '@/lib/prisma'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-100">
        <AppSidebar user={session.user} />
        <SidebarInset className="bg-gray-100">
          <Header user={session.user} />
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
