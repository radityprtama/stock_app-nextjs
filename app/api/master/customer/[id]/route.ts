import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { customerSchema } from '@/lib/validations'

// GET /api/master/customer/[id] - Get specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        suratJalan: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { detail: true },
            },
          },
        },
        returJual: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            suratJalan: true,
            returJual: true,
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PUT /api/master/customer/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin', 'manager', 'sales'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const validatedData = customerSchema.parse(body)

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if kode already exists (excluding current customer)
    const duplicateKode = await prisma.customer.findFirst({
      where: {
        kode: validatedData.kode,
        id: { not: id },
      },
    })

    if (duplicateKode) {
      return NextResponse.json(
        { error: 'Kode customer sudah ada' },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer berhasil diperbarui',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/master/customer/[id] - Delete customer (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            suratJalan: true,
            returJual: true,
          },
        },
      },
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if customer has related data
    if (
      existingCustomer._count.suratJalan > 0 ||
      existingCustomer._count.returJual > 0
    ) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus customer yang memiliki transaksi' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.customer.update({
      where: { id },
      data: { aktif: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Customer berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}