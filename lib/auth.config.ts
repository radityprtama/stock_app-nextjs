import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const protectedRoutes = ['/dashboard']
const adminRoutes = ['/dashboard/master/user']
const publicRoutes = ['/auth/login', '/auth/error']

export default {
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    authorized: async ({ auth: session, request: { nextUrl } }) => {
      const isLoggedIn = !!session?.user
      const isPublicRoute = publicRoutes.includes(nextUrl.pathname)
      const isProtectedRoute = protectedRoutes.some(route =>
        nextUrl.pathname.startsWith(route)
      )
      const isAdminRoute = adminRoutes.some(route =>
        nextUrl.pathname.startsWith(route)
      )

      // Redirect authenticated users away from auth pages
      if (isLoggedIn && isPublicRoute) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }

      // Redirect unauthenticated users to login
      if (!isLoggedIn && isProtectedRoute) {
        return NextResponse.redirect(new URL('/auth/login', nextUrl))
      }

      // Check admin permissions for admin routes
      if (isLoggedIn && isAdminRoute && session.user.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig