import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET /api/stok/realtime-movements - Get real-time stock movements
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const gudangId = searchParams.get('gudangId')
    const barangId = searchParams.get('barangId')
    const hours = parseInt(searchParams.get('hours') || '24') // Default last 24 hours

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000))

    // Fetch real-time stock movements from all sources
    const [barangMasukData, suratJalanData] = await Promise.all([
      // Get recent barang masuk
      prisma.barangMasuk.findMany({
        where: {
          tanggal: {
            gte: startDate,
            lte: endDate,
          },
          ...(gudangId && { gudangId }),
        },
        include: {
          supplier: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          gudang: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          detail: {
            include: {
              barang: {
                select: {
                  id: true,
                  kode: true,
                  nama: true,
                  satuan: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              nama: true,
              email: true,
            },
          },
        },
        orderBy: { tanggal: 'desc' },
        take: limit,
      }),

      // Get recent surat jalan
      prisma.suratJalan.findMany({
        where: {
          tanggal: {
            gte: startDate,
            lte: endDate,
          },
          ...(gudangId && { gudangId }),
        },
        include: {
          customer: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          gudang: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          detail: {
            include: {
              barang: {
                select: {
                  id: true,
                  kode: true,
                  nama: true,
                  satuan: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              nama: true,
              email: true,
            },
          },
        },
        orderBy: { tanggal: 'desc' },
        take: limit,
      }),
    ])

    // Get recent stock adjustments (if any)
    const stokAdjustments = await prisma.stokHistory.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        ...(gudangId && { gudangId }),
      },
      include: {
        barang: {
          select: {
            id: true,
            kode: true,
            nama: true,
            satuan: true,
          },
        },
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
        user: {
          select: {
            id: true,
            nama: true,
            email: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    // Convert all data to unified real-time movement format
    const movements: any[] = []

    // Process barang masuk
    barangMasukData.forEach((bm) => {
      bm.detail?.forEach((detail) => {
        movements.push({
          id: `bm-${bm.id}-${detail.id}`,
          type: 'masuk',
          barangId: detail.barang?.id || '',
          barangNama: detail.barang?.nama || 'Unknown',
          barangKode: detail.barang?.kode || 'N/A',
          gudangId: bm.gudang?.id || '',
          gudangNama: bm.gudang?.nama || 'Unknown',
          qty: detail.qty || 0,
          dokumentType: 'Barang Masuk',
          dokumentNo: bm.noDokumen || `BM-${bm.id}`,
          timestamp: bm.tanggal.toISOString(),
          user: bm.user?.nama || 'System',
          referensi: bm.supplier?.nama,
        })
      })
    })

    // Process surat jalan
    suratJalanData.forEach((sj) => {
      sj.detail?.forEach((detail) => {
        movements.push({
          id: `sj-${sj.id}-${detail.id}`,
          type: 'keluar',
          barangId: detail.barang?.id || '',
          barangNama: detail.barang?.nama || 'Unknown',
          barangKode: detail.barang?.kode || 'N/A',
          gudangId: sj.gudang?.id || '',
          gudangNama: sj.gudang?.nama || 'Unknown',
          qty: detail.qty || 0,
          dokumentType: 'Surat Jalan',
          dokumentNo: sj.noSJ || `SJ-${sj.id}`,
          timestamp: sj.tanggal.toISOString(),
          user: sj.user?.nama || 'System',
          referensi: sj.customer?.nama,
        })
      })
    })

    // Process stock adjustments
    stokAdjustments.forEach((adj) => {
      movements.push({
        id: `adj-${adj.id}`,
        type: adj.tipePerubahan === 'penambahan' ? 'masuk' : 'keluar',
        barangId: adj.barang?.id || '',
        barangNama: adj.barang?.nama || 'Unknown',
        barangKode: adj.barang?.kode || 'N/A',
        gudangId: adj.gudang?.id || '',
        gudangNama: adj.gudang?.nama || 'Unknown',
        qty: Math.abs(adj.perubahan || 0),
        dokumentType: 'Penyesuaian Stok',
        dokumentNo: adj.dokumenRef || `ADJ-${adj.id}`,
        timestamp: adj.timestamp?.toISOString() || new Date().toISOString(),
        user: adj.user?.nama || 'System',
        referensi: adj.keterangan,
      })
    })

    // Sort by timestamp (most recent first)
    movements.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime()
      const dateB = new Date(b.timestamp).getTime()
      return dateB - dateA
    })

    // Filter by barang if specified
    const filteredMovements = barangId
      ? movements.filter(m => m.barangId === barangId)
      : movements

    // Return only the requested limit
    const limitedMovements = filteredMovements.slice(0, limit)

    return NextResponse.json({
      success: true,
      data: limitedMovements,
      statistics: {
        total: movements.length,
        masuk: movements.filter(m => m.type === 'masuk').length,
        keluar: movements.filter(m => m.type === 'keluar').length,
        totalMasukQty: movements.filter(m => m.type === 'masuk').reduce((sum, m) => sum + m.qty, 0),
        totalKeluarQty: movements.filter(m => m.type === 'keluar').reduce((sum, m) => sum + m.qty, 0),
        netMovement: movements.filter(m => m.type === 'masuk').reduce((sum, m) => sum + m.qty, 0) -
                     movements.filter(m => m.type === 'keluar').reduce((sum, m) => sum + m.qty, 0),
        timeframe: `${hours} jam terakhir`,
        lastUpdate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching realtime movements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch real-time stock movements' },
      { status: 500 }
    )
  }
}