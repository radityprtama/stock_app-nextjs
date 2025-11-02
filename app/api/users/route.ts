import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'manager', 'staff_gudang', 'sales']).optional(),
  approved: z.string().optional().transform(val => val ? val === 'true' : undefined),
  aktif: z.string().optional().transform(val => val ? val === 'true' : undefined),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to view users (admin, manager, super_admin)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, approved: true, aktif: true }
    })

    if (!user || !user.approved || !user.aktif) {
      return NextResponse.json({ success: false, error: 'Account not approved or inactive' }, { status: 403 })
    }

    if (!['super_admin', 'admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    const where: Prisma.UserWhereInput = {}

    if (query.search) {
      where.OR = [
        { namaLengkap: { contains: query.search } },
        { email: { contains: query.search } },
        { username: { contains: query.search } },
      ]
    }

    if (query.role) {
      where.role = query.role
    }

    if (typeof query.approved === 'boolean') {
      where.approved = query.approved
    }

    if (typeof query.aktif === 'boolean') {
      where.aktif = query.aktif
    }

    // Get total count
    const total = await prisma.user.count({ where })

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      orderBy: [
        { approved: 'asc' }, // Unapproved users first
        { createdAt: 'desc' }
      ],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        email: true,
        username: true,
        namaLengkap: true,
        role: true,
        telepon: true,
        alamat: true,
        profileImage: true,
        aktif: true,
        approved: true,
        approvedAt: true,
        lastLoginAt: true,
        loginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        approvedByUser: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only super_admin can create users directly
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, approved: true, aktif: true }
    })

    if (!currentUser || currentUser.role !== 'super_admin' || !currentUser.approved || !currentUser.aktif) {
      return NextResponse.json({ success: false, error: 'Only super admin can create users' }, { status: 403 })
    }

    const body = await request.json()

    const createSchema = z.object({
      email: z.string().email(),
      username: z.string().min(3),
      password: z.string().min(8),
      namaLengkap: z.string().min(2),
      role: z.enum(['super_admin', 'admin', 'manager', 'staff_gudang', 'sales']),
      telepon: z.string().optional(),
      alamat: z.string().optional(),
      approved: z.boolean().default(true), // Admin can create approved users
      aktif: z.boolean().default(true),
    })

    const validatedData = createSchema.parse(body)

    // Check if email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Email or username already exists'
      }, { status: 400 })
    }

    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
        approvedAt: validatedData.approved ? new Date() : null,
        approvedBy: validatedData.approved ? session.user.id : null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        namaLengkap: true,
        role: true,
        approved: true,
        aktif: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: user
    })

  } catch (error) {
    console.error('Create user error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create user'
    }, { status: 500 })
  }
}
