import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      username: string
      approved: boolean
      aktif: boolean
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    username: string
    approved: boolean
    aktif: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    username: string
    approved: boolean
    aktif: boolean
  }
}
