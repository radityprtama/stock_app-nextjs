import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const stockQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['nama', 'kode', 'totalStok', 'totalNilai', 'minStok', 'maxStok']).default('nama'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  golonganId: z.string().optional(),
  gudangId: z.string().optional(),
  statusStok: z.enum(['normal', 'low', 'critical', 'overstock', 'outOfStock']).optional(),
  isDropship: z.enum(['true', 'false']).optional(),
  aktif: z.enum(['true', 'false']).optional(),
  includeZeroStock: z.enum(['true', 'false']).default('false'),
})

// GET /api/stok - Get comprehensive stock overview with advanced filtering and analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryData = Object.fromEntries(searchParams.entries())
    const validatedQuery = stockQuerySchema.parse(queryData)

    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      golonganId,
      gudangId,
      statusStok,
      isDropship,
      aktif,
      includeZeroStock
    } = validatedQuery

    const skip = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (search) {
      where.OR = [
        { kode: { contains: search, mode: 'insensitive' as const } },
        { nama: { contains: search, mode: 'insensitive' as const } },
        { merk: { contains: search, mode: 'insensitive' as const } },
        { tipe: { contains: search, mode: 'insensitive' as const } },
        { ukuran: { contains: search, mode: 'insensitive' as const } },
      ]
    }

    if (golonganId) {
      where.golonganId = golonganId
    }

    if (isDropship !== undefined) {
      where.isDropship = isDropship === 'true'
    }

    if (aktif !== undefined) {
      where.aktif = aktif === 'true'
    }

    // Get base barang data with stock information
    const [barangs, total] = await Promise.all([
      prisma.barang.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          golongan: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          stokBarang: {
            include: {
              gudang: {
                select: {
                  id: true,
                  kode: true,
                  nama: true,
                },
              },
            },
          },
          _count: {
            select: {
              detailBarangMasuk: true,
              detailSuratJalan: true,
              detailReturBeli: true,
              detailReturJual: true,
            },
          },
        },
      }),
      prisma.barang.count({ where }),
    ])

    // Process stock data and apply additional filters
    let processedBarangs = barangs.map(barang => {
      const stokPerGudang = barang.stokBarang.reduce((acc, stok) => {
        acc[stok.gudangId] = {
          gudang: stok.gudang,
          qty: stok.qty,
          nilai: stok.qty * Number(barang.hargaBeli),
        }
        return acc
      }, {} as Record<string, any>)

      const totalStok = barang.stokBarang.reduce((sum, stok) => sum + stok.qty, 0)
      const totalNilai = totalStok * Number(barang.hargaBeli)

      // Determine stock status
      let status: string = 'normal'
      if (totalStok === 0) {
        status = 'outOfStock'
      } else if (totalStok < barang.minStok) {
        status = 'critical'
      } else if (barang.maxStok && totalStok > barang.maxStok) {
        status = 'overstock'
      } else if (totalStok < barang.minStok * 1.2) {
        status = 'low'
      }

      // Calculate ABC classification based on value
      const abcClass = totalNilai > 1000000 ? 'A' : totalNilai > 100000 ? 'B' : 'C'

      return {
        ...barang,
        stokPerGudang,
        totalStok,
        totalNilai,
        status,
        abcClass,
        turnoverRate: 0, // Will be calculated later
        lastTransactionDate: null, // Will be calculated later
      }
    })

    // Apply gudang filter if specified
    if (gudangId) {
      processedBarangs = processedBarangs.filter(barang =>
        barang.stokPerGudang[gudangId]?.qty > 0
      )
    }

    // Apply stock status filter
    if (statusStok) {
      processedBarangs = processedBarangs.filter(barang =>
        barang.status === statusStok
      )
    }

    // Apply zero stock filter
    if (includeZeroStock === 'false') {
      processedBarangs = processedBarangs.filter(barang => barang.totalStok > 0)
    }

    // Get additional analytics data
    const [
      warehouseDistribution,
      golonganStats,
      lowStockItems,
      outOfStockItems,
      totalStockValue,
      abcAnalysis
    ] = await Promise.all([
      // Stock distribution per warehouse
      prisma.stokBarang.groupBy({
        by: ['gudangId'],
        _sum: { qty: true },
        _count: { barangId: true },
      }),
      // Statistics per category
      prisma.barang.groupBy({
        by: ['golonganId'],
        _count: { id: true },
        where: aktif !== undefined ? { aktif: aktif === 'true' } : undefined,
      }),
      // Low stock items count
      prisma.barang.count({
        where: {
          aktif: true,
          stokBarang: {
            every: { qty: { lt: prisma.barang.fields.minStok } }
          }
        },
      }),
      // Out of stock items count
      prisma.barang.count({
        where: {
          aktif: true,
          stokBarang: {
            every: { qty: 0 }
          }
        },
      }),
      // Total stock value calculation
      prisma.stokBarang.aggregate({
        _sum: { qty: true },
      }),
      // ABC Analysis data
      Promise.all(['A', 'B', 'C'].map(async (cls) => {
        const threshold = cls === 'A' ? 1000000 : cls === 'B' ? 100000 : 0
        const items = processedBarangs.filter(b => b.totalNilai > threshold)
        return {
          class: cls,
          count: items.length,
          value: items.reduce((sum, item) => sum + item.totalNilai, 0),
          percentage: 0, // Will be calculated
        }
      })),
    ])

    // Calculate ABC percentages
    const totalABCValue = abcAnalysis.reduce((sum, cls) => sum + cls.value, 0)
    abcAnalysis.forEach(cls => {
      cls.percentage = totalABCValue > 0 ? (cls.value / totalABCValue) * 100 : 0
    })

    // Get warehouse details for distribution
    const warehouseDetails = await prisma.gudang.findMany({
      where: {
        id: { in: warehouseDistribution.map(w => w.gudangId) }
      },
      select: {
        id: true,
        kode: true,
        nama: true,
      },
    })

    const warehouseDistributionWithDetails = warehouseDistribution.map(w => ({
      ...w,
      gudang: warehouseDetails.find(g => g.id === w.gudangId),
    }))

    // Get category details
    const categoryDetails = await prisma.golongan.findMany({
      where: {
        id: { in: golonganStats.map(g => g.golonganId) }
      },
      select: {
        id: true,
        kode: true,
        nama: true,
      },
    })

    const golonganStatsWithDetails = golonganStats.map(g => ({
      ...g,
      golongan: categoryDetails.find(c => c.id === g.golonganId),
    }))

    // Calculate final statistics
    const stats = {
      totalItems: processedBarangs.length,
      totalStockValue: processedBarangs.reduce((sum, item) => sum + item.totalNilai, 0),
      totalStockQty: processedBarangs.reduce((sum, item) => sum + item.totalStok, 0),
      lowStockItems: processedBarangs.filter(item => item.status === 'critical' || item.status === 'low').length,
      outOfStockItems: processedBarangs.filter(item => item.status === 'outOfStock').length,
      overstockItems: processedBarangs.filter(item => item.status === 'overstock').length,
      normalItems: processedBarangs.filter(item => item.status === 'normal').length,
      activeItems: processedBarangs.filter(item => item.aktif).length,
      dropshipItems: processedBarangs.filter(item => item.isDropship).length,
      abcAnalysis,
      warehouseDistribution: warehouseDistributionWithDetails,
      golonganStats: golonganStatsWithDetails,
    }

    // Apply pagination after filtering
    const finalTotal = processedBarangs.length
    const paginatedData = processedBarangs.slice(skip, skip + limit)

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit),
      },
      statistics: stats,
      filters: {
        search,
        golonganId,
        gudangId,
        statusStok,
        isDropship,
        aktif,
        includeZeroStock,
      },
    })
  } catch (error) {
    console.error('Error fetching stock data:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    )
  }
}

// POST /api/stok - Stock adjustment or bulk operations
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin', 'manager', 'staff_gudang'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { type, adjustments } = body

    if (type === 'adjustment') {
      // Process stock adjustments
      const results = await Promise.all(
        adjustments.map(async (adjustment: any) => {
          const { barangId, gudangId, qty, reason } = adjustment

          // Find existing stock record
          const existingStock = await prisma.stokBarang.findUnique({
            where: {
              barangId_gudangId: { barangId, gudangId }
            }
          })

          if (existingStock) {
            // Update existing stock
            return await prisma.stokBarang.update({
              where: { id: existingStock.id },
              data: { qty: existingStock.qty + qty }
            })
          } else {
            // Create new stock record
            return await prisma.stokBarang.create({
              data: { barangId, gudangId, qty: Math.max(0, qty) }
            })
          }
        })
      )

      return NextResponse.json({
        success: true,
        data: results,
        message: 'Stock adjustment completed successfully'
      })
    }

    return NextResponse.json(
      { error: 'Invalid operation type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in stock operation:', error)
    return NextResponse.json(
      { error: 'Failed to process stock operation' },
      { status: 500 }
    )
  }
}