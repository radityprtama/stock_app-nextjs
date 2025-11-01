import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET /api/laporan/pembelian
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const supplierId = searchParams.get('supplierId') || ''
    const barangId = searchParams.get('barangId') || ''
    const gudangId = searchParams.get('gudangId') || ''
    const groupBy = searchParams.get('groupBy') || 'tanggal' // tanggal, supplier, barang

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate + 'T23:59:59.999Z')
    }

    // Get Barang Masuk data
    const barangMasuk = await prisma.barangMasuk.findMany({
      where: {
        status: 'posted',
        ...(Object.keys(dateFilter).length > 0 && { tanggal: dateFilter }),
        ...(supplierId && { supplierId }),
        ...(gudangId && { gudangId }),
        ...(barangId && {
          detail: {
            some: { barangId }
          }
        })
      },
      include: {
        supplier: true,
        gudang: true,
        detail: {
          include: {
            barang: {
              include: {
                golongan: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    type PurchaseItem = {
      tanggal: Date
      noDokumen: string
      supplier: typeof barangMasuk[number]['supplier']
      gudang: typeof barangMasuk[number]['gudang']
      barang: typeof barangMasuk[number]['detail'][number]['barang']
      qty: number
      hargaBeli: number
      subtotal: number
      keterangan: string | null
    }

    // Flatten the data for easier processing
    const purchaseData: PurchaseItem[] = []
    barangMasuk.forEach(bm => {
      bm.detail.forEach(detail => {
        purchaseData.push({
          tanggal: bm.tanggal,
          noDokumen: bm.noDokumen,
          supplier: bm.supplier,
          gudang: bm.gudang,
          barang: detail.barang,
          qty: detail.qty,
          hargaBeli: parseFloat(detail.harga.toString()),
          subtotal: parseFloat(detail.subtotal.toString()),
          keterangan: bm.keterangan ?? null
        })
      })
    })

    // Group data based on groupBy parameter
    let groupedData: any[] = []

    switch (groupBy) {
      case 'supplier':
        const supplierGroups = purchaseData.reduce((acc, item) => {
          const key = item.supplier.id
          if (!acc[key]) {
            acc[key] = {
              supplier: item.supplier,
              items: [],
              totalQty: 0,
              totalNilai: 0,
              transactions: 0
            }
          }
          acc[key].items.push(item)
          acc[key].totalQty += item.qty
          acc[key].totalNilai += item.subtotal
          acc[key].transactions += 1
          return acc
        }, {} as any)
        groupedData = Object.values(supplierGroups)
        break

      case 'barang':
        const barangGroups = purchaseData.reduce((acc, item) => {
          const key = item.barang.id
          if (!acc[key]) {
            acc[key] = {
              barang: item.barang,
              items: [],
              totalQty: 0,
              totalNilai: 0,
              transactions: 0,
              suppliers: new Set()
            }
          }
          acc[key].items.push(item)
          acc[key].totalQty += item.qty
          acc[key].totalNilai += item.subtotal
          acc[key].transactions += 1
          acc[key].suppliers.add(item.supplier.id)
          return acc
        }, {} as any)
        groupedData = Object.values(barangGroups).map((group: any) => ({
          ...group,
          uniqueSuppliers: group.suppliers.size
        }))
        break

      case 'tanggal':
      default:
        const tanggalGroups = purchaseData.reduce((acc, item) => {
          const dateKey = item.tanggal.toISOString().split('T')[0]
          if (!acc[dateKey]) {
            acc[dateKey] = {
              tanggal: dateKey,
              items: [],
              totalQty: 0,
              totalNilai: 0,
              transactions: 0,
              suppliers: new Set()
            }
          }
          acc[dateKey].items.push(item)
          acc[dateKey].totalQty += item.qty
          acc[dateKey].totalNilai += item.subtotal
          acc[dateKey].transactions += 1
          acc[dateKey].suppliers.add(item.supplier.id)
          return acc
        }, {} as any)
        groupedData = Object.values(tanggalGroups).map((group: any) => ({
          ...group,
          uniqueSuppliers: group.suppliers.size
        }))
        break
    }

    // Sort grouped data
    groupedData.sort((a, b) => {
      switch (groupBy) {
        case 'supplier':
          return a.supplier.nama.localeCompare(b.supplier.nama)
        case 'barang':
          return a.barang.nama.localeCompare(b.barang.nama)
        case 'tanggal':
        default:
          return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
      }
    })

    // Calculate summary
    const summary = {
      totalTransactions: barangMasuk.length,
      totalQuantity: purchaseData.reduce((sum, item) => sum + item.qty, 0),
      totalPurchases: purchaseData.reduce((sum, item) => sum + item.subtotal, 0),
      averageTransactionValue: purchaseData.length > 0 ?
        purchaseData.reduce((sum, item) => sum + item.subtotal, 0) / purchaseData.length : 0,
      uniqueSuppliers: new Set(purchaseData.map(item => item.supplier.id)).size,
      uniqueProducts: new Set(purchaseData.map(item => item.barang.id)).size,
      averageUnitPrice: purchaseData.length > 0 ?
        purchaseData.reduce((sum, item) => sum + item.hargaBeli, 0) / purchaseData.length : 0,
      filters: {
        startDate,
        endDate,
        supplierId,
        barangId,
        gudangId,
        groupBy
      }
    }

    type SupplierAggregate = {
      supplier: PurchaseItem['supplier']
      totalNilai: number
      totalQty: number
    }

    type ProductAggregate = {
      barang: PurchaseItem['barang']
      totalQty: number
      totalNilai: number
    }

    // Top suppliers by purchase value
    const supplierAggregates = purchaseData.reduce<Record<string, SupplierAggregate>>((acc, item) => {
      const key = item.supplier.id
      if (!acc[key]) {
        acc[key] = { supplier: item.supplier, totalNilai: 0, totalQty: 0 }
      }
      acc[key].totalNilai += item.subtotal
      acc[key].totalQty += item.qty
      return acc
    }, {})

    const topSuppliers = Object.values(supplierAggregates)
      .sort((a, b) => b.totalNilai - a.totalNilai)
      .slice(0, 10)

    // Top purchased products by quantity
    const productAggregates = purchaseData.reduce<Record<string, ProductAggregate>>((acc, item) => {
      const key = item.barang.id
      if (!acc[key]) {
        acc[key] = { barang: item.barang, totalQty: 0, totalNilai: 0 }
      }
      acc[key].totalQty += item.qty
      acc[key].totalNilai += item.subtotal
      return acc
    }, {})

    const topProducts = Object.values(productAggregates)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10)

    // Monthly trend
    const monthlyTrend = purchaseData.reduce((acc, item) => {
      const monthKey = item.tanggal.toISOString().slice(0, 7) // YYYY-MM
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, totalQty: 0, totalNilai: 0, transactions: 0 }
      }
      acc[monthKey].totalQty += item.qty
      acc[monthKey].totalNilai += item.subtotal
      acc[monthKey].transactions += 1
      return acc
    }, {} as any)

    const report = {
      summary,
      groupedData,
      topSuppliers,
      topProducts,
      monthlyTrend: Object.values(monthlyTrend).sort((a, b) => a.month.localeCompare(b.month)),
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating purchase report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
