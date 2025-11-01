import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET /api/laporan/stok
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gudangId = searchParams.get('gudangId') || ''
    const golonganId = searchParams.get('golonganId') || ''
    const lowStock = searchParams.get('lowStock') === 'true'
    const format = searchParams.get('format') || 'json'

    const where: any = {}

    if (gudangId) {
      where.gudangId = gudangId
    }

    if (golonganId) {
      where.barang = {
        golonganId: golonganId
      }
    }

    if (lowStock) {
      where.barang = {
        ...where.barang,
        minStok: {
          gt: 0
        }
      }
    }

    const stockData = await prisma.stokBarang.findMany({
      where,
      include: {
        barang: {
          include: {
            golongan: true
          }
        },
        gudang: true
      },
      orderBy: [
        { gudang: { nama: 'asc' } },
        { barang: { nama: 'asc' } }
      ]
    })

    // Process data for report
    const reportData = stockData.map(item => ({
      id: item.id,
      barang: {
        id: item.barang.id,
        kode: item.barang.kode,
        nama: item.barang.nama,
        ukuran: item.barang.ukuran,
        tipe: item.barang.tipe,
        merk: item.barang.merk,
        satuan: item.barang.satuan,
        minStok: item.barang.minStok,
        maxStok: item.barang.maxStok,
        golongan: item.barang.golongan
      },
      gudang: {
        id: item.gudang.id,
        kode: item.gudang.kode,
        nama: item.gudang.nama
      },
      qty: item.qty,
      nilai: parseFloat((item.qty * item.barang.hargaBeli).toFixed(2)),
      status: item.qty <= item.barang.minStok ? 'LOW_STOCK' :
              item.barang.maxStok && item.qty >= item.barang.maxStok ? 'OVER_STOCK' : 'NORMAL'
    }))

    // Filter low stock if requested
    let finalData = reportData
    if (lowStock) {
      finalData = reportData.filter(item => item.status === 'LOW_STOCK')
    }

    // Calculate summary
    const summary = {
      totalItems: finalData.length,
      totalQuantity: finalData.reduce((sum, item) => sum + item.qty, 0),
      totalValue: finalData.reduce((sum, item) => sum + item.nilai, 0),
      lowStockItems: finalData.filter(item => item.status === 'LOW_STOCK').length,
      overStockItems: finalData.filter(item => item.status === 'OVER_STOCK').length,
      normalItems: finalData.filter(item => item.status === 'NORMAL').length
    }

    // Group by gudang
    const byGudang = finalData.reduce((acc, item) => {
      const gudangKey = item.gudang.nama
      if (!acc[gudangKey]) {
        acc[gudangKey] = {
          gudang: item.gudang,
          items: [],
          totalQty: 0,
          totalNilai: 0
        }
      }
      acc[gudangKey].items.push(item)
      acc[gudangKey].totalQty += item.qty
      acc[gudangKey].totalNilai += item.nilai
      return acc
    }, {} as any)

    // Group by golongan
    const byGolongan = finalData.reduce((acc, item) => {
      const golonganKey = item.barang.golongan.nama
      if (!acc[golonganKey]) {
        acc[golonganKey] = {
          golongan: item.barang.golongan,
          items: [],
          totalQty: 0,
          totalNilai: 0
        }
      }
      acc[golonganKey].items.push(item)
      acc[golonganKey].totalQty += item.qty
      acc[golonganKey].totalNilai += item.nilai
      return acc
    }, {} as any)

    const report = {
      summary,
      data: finalData,
      byGudang: Object.values(byGudang),
      byGolongan: Object.values(byGolongan),
      filters: {
        gudangId,
        golonganId,
        lowStock
      },
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating stock report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}