import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET /api/master/barang/[id]/suppliers
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
    const supplierBarangs = await prisma.supplierBarang.findMany({
      where: {
        barangId: id
      },
      include: {
        supplier: true,
        barang: {
          include: {
            golongan: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { supplier: { nama: 'asc' } }
      ]
    })

    return NextResponse.json(supplierBarangs)
  } catch (error) {
    console.error('Error fetching supplier barang:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/master/barang/[id]/suppliers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const body = await request.json()
    const { supplierId, hargaBeli, leadTime, isPrimary } = body

    // Validate required fields
    if (!supplierId || !hargaBeli) {
      return NextResponse.json(
        { error: 'Supplier ID and harga beli are required' },
        { status: 400 }
      )
    }

    // Check if barang exists
    const barang = await prisma.barang.findUnique({
      where: { id: id }
    })

    if (!barang) {
      return NextResponse.json(
        { error: 'Barang not found' },
        { status: 404 }
      )
    }

    // Check if supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Check if this mapping already exists
    const existingMapping = await prisma.supplierBarang.findUnique({
      where: {
        barangId_supplierId: {
          barangId: id,
          supplierId: supplierId
        }
      }
    })

    if (existingMapping) {
      return NextResponse.json(
        { error: 'Supplier is already mapped to this barang' },
        { status: 400 }
      )
    }

    // If setting as primary, unset other primary suppliers for this barang
    if (isPrimary) {
      await prisma.supplierBarang.updateMany({
        where: {
          barangId: id,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      })
    }

    const supplierBarang = await prisma.supplierBarang.create({
      data: {
        barangId: id,
        supplierId,
        hargaBeli: parseFloat(hargaBeli),
        leadTime: parseInt(leadTime) || 0,
        isPrimary: Boolean(isPrimary)
      },
      include: {
        supplier: true,
        barang: {
          include: {
            golongan: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: supplierBarang,
      message: 'Supplier mapping created successfully'
    })
  } catch (error) {
    console.error('Error creating supplier barang:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}