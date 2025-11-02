import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { loginSchema } from '@/lib/validations'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        try {
          const { email, password } = loginSchema.parse(credentials)

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            return null
          }

          // Check if user account is locked
          if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
            return null
          }

          // Check if user is approved
          if (!user.approved) {
            return null
          }

          // Check if user is active
          if (!user.aktif) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(password, user.password)

          if (!isPasswordValid) {
            // Increment login attempts
            const loginAttempts = user.loginAttempts + 1
            const lockedUntil = loginAttempts >= 5 ?
              new Date(Date.now() + 15 * 60 * 1000) : // Lock for 15 minutes after 5 failed attempts
              null

            await prisma.user.update({
              where: { id: user.id },
              data: {
                loginAttempts,
                lockedUntil,
              }
            })

            return null
          }

          // Reset login attempts on successful login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
            }
          })

          return {
            id: user.id,
            email: user.email,
            name: user.namaLengkap,
            role: user.role,
            username: user.username,
            approved: user.approved,
            aktif: user.aktif,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.username = user.username
        token.approved = user.approved
        token.aktif = user.aktif
      } else if (token.sub) {
        const existingUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            username: true,
            approved: true,
            aktif: true,
          },
        })

        if (existingUser) {
          token.role = existingUser.role
          token.username = existingUser.username
          token.approved = existingUser.approved
          token.aktif = existingUser.aktif
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub ?? session.user.id

        if (typeof token.role === 'string') {
          session.user.role = token.role
        }

        if (typeof token.username === 'string') {
          session.user.username = token.username
        }

        session.user.approved = Boolean(token.approved)
        session.user.aktif = Boolean(token.aktif)
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
})
