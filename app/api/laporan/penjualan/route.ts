import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET /api/laporan/penjualan
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const customerId = searchParams.get('customerId') || ''
    const barangId = searchParams.get('barangId') || ''
    const gudangId = searchParams.get('gudangId') || ''
    const groupBy = searchParams.get('groupBy') || 'tanggal' // tanggal, customer, barang

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate + 'T23:59:59.999Z')
    }

    // Get Surat Jalan data
    const suratJalan = await prisma.suratJalan.findMany({
      where: {
        status: { in: ['in_transit', 'delivered'] },
        ...(Object.keys(dateFilter).length > 0 && {
          OR: [
            { tanggalKirim: dateFilter },
            { createdAt: dateFilter }
          ]
        }),
        ...(customerId && { customerId }),
        ...(gudangId && { gudangId }),
        ...(barangId && {
          detail: {
            some: { barangId }
          }
        })
      },
      include: {
        customer: true,
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

    // Flatten the data for easier processing
    const salesData: any[] = []
    suratJalan.forEach(sj => {
      sj.detail.forEach(detail => {
        salesData.push({
          tanggal: sj.tanggalKirim || sj.tanggal,
          noSJ: sj.noSJ,
          customer: sj.customer,
          gudang: sj.gudang,
          barang: detail.barang,
          qty: detail.qty,
          hargaJual: parseFloat(detail.hargaJual?.toString() || '0'),
          subtotal: parseFloat(detail.subtotal?.toString() || '0'),
          keterangan: sj.keterangan,
          isDropship: detail.isDropship
        })
      })
    })

    // Group data based on groupBy parameter
    let groupedData: any[] = []

    switch (groupBy) {
      case 'customer':
        const customerGroups = salesData.reduce((acc, item) => {
          const key = item.customer.id
          if (!acc[key]) {
            acc[key] = {
              customer: item.customer,
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
        groupedData = Object.values(customerGroups)
        break

      case 'barang':
        const barangGroups = salesData.reduce((acc, item) => {
          const key = item.barang.id
          if (!acc[key]) {
            acc[key] = {
              barang: item.barang,
              items: [],
              totalQty: 0,
              totalNilai: 0,
              transactions: 0,
              customers: new Set()
            }
          }
          acc[key].items.push(item)
          acc[key].totalQty += item.qty
          acc[key].totalNilai += item.subtotal
          acc[key].transactions += 1
          acc[key].customers.add(item.customer.id)
          return acc
        }, {} as any)
        groupedData = Object.values(barangGroups).map((group: any) => ({
          ...group,
          uniqueCustomers: group.customers.size
        }))
        break

      case 'tanggal':
      default:
        const tanggalGroups = salesData.reduce((acc, item) => {
          const dateKey = item.tanggal.toISOString().split('T')[0]
          if (!acc[dateKey]) {
            acc[dateKey] = {
              tanggal: dateKey,
              items: [],
              totalQty: 0,
              totalNilai: 0,
              transactions: 0,
              customers: new Set()
            }
          }
          acc[dateKey].items.push(item)
          acc[dateKey].totalQty += item.qty
          acc[dateKey].totalNilai += item.subtotal
          acc[dateKey].transactions += 1
          acc[dateKey].customers.add(item.customer.id)
          return acc
        }, {} as any)
        groupedData = Object.values(tanggalGroups).map((group: any) => ({
          ...group,
          uniqueCustomers: group.customers.size
        }))
        break
    }

    // Sort grouped data
    groupedData.sort((a, b) => {
      switch (groupBy) {
        case 'customer':
          return a.customer.nama.localeCompare(b.customer.nama)
        case 'barang':
          return a.barang.nama.localeCompare(b.barang.nama)
        case 'tanggal':
        default:
          return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
      }
    })

    // Calculate summary
    const summary = {
      totalTransactions: suratJalan.length,
      totalQuantity: salesData.reduce((sum, item) => sum + item.qty, 0),
      totalRevenue: salesData.reduce((sum, item) => sum + item.subtotal, 0),
      averageTransactionValue: salesData.length > 0 ?
        salesData.reduce((sum, item) => sum + item.subtotal, 0) / salesData.length : 0,
      dropshipTransactions: salesData.filter(item => item.isDropship).length,
      regularTransactions: salesData.filter(item => !item.isDropship).length,
      uniqueCustomers: new Set(salesData.map(item => item.customer.id)).size,
      uniqueProducts: new Set(salesData.map(item => item.barang.id)).size,
      filters: {
        startDate,
        endDate,
        customerId,
        barangId,
        gudangId,
        groupBy
      }
    }

    // Top customers by revenue
    const topCustomers = Object.entries(
      salesData.reduce((acc, item) => {
        const key = item.customer.id
        if (!acc[key]) {
          acc[key] = { customer: item.customer, totalNilai: 0, totalQty: 0 }
        }
        acc[key].totalNilai += item.subtotal
        acc[key].totalQty += item.qty
        return acc
      }, {} as any)
    )
      .map(([_, data]: any) => data)
      .sort((a, b) => b.totalNilai - a.totalNilai)
      .slice(0, 10)

    // Top products by quantity
    const topProducts = Object.entries(
      salesData.reduce((acc, item) => {
        const key = item.barang.id
        if (!acc[key]) {
          acc[key] = { barang: item.barang, totalQty: 0, totalNilai: 0 }
        }
        acc[key].totalQty += item.qty
        acc[key].totalNilai += item.subtotal
        return acc
      }, {} as any)
    )
      .map(([_, data]: any) => data)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10)

    const report = {
      summary,
      groupedData,
      topCustomers,
      topProducts,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating sales report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}