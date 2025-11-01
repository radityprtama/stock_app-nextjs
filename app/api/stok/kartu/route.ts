import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const stockCardQuerySchema = z.object({
  barangId: z.string().min(1, 'Barang ID wajib diisi'),
  gudangId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  transactionType: z.enum(['all', 'masuk', 'keluar']).default('all'),
  sortBy: z.enum(['tanggal', 'type', 'qty', 'saldo']).default('tanggal'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

interface StockTransaction {
  id: string
  tanggal: Date
  type: 'masuk' | 'keluar'
  dokumentType: string
  dokumentId: string
  dokumentNo: string
  qty: number
  harga: number
  subtotal: number
  saldo: number
  keterangan?: string
  referensi?: string
  supplier?: string
  customer?: string
  gudang?: string
}

// GET /api/stok/kartu - Get stock card (mutation history) for specific item
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryData = Object.fromEntries(searchParams.entries())
    const validatedQuery = stockCardQuerySchema.parse(queryData)

    const {
      barangId,
      gudangId,
      startDate,
      endDate,
      page,
      limit,
      transactionType,
      sortBy,
      sortOrder
    } = validatedQuery

    // Validate barang exists
    const barang = await prisma.barang.findUnique({
      where: { id: barangId },
      include: {
        golongan: true,
      },
    })

    if (!barang) {
      return NextResponse.json(
        { error: 'Barang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // Get opening balance (transactions before start date)
    let openingBalance = 0
    if (startDate) {
      const openingTransactions = await getStockTransactions(
        barangId,
        gudangId,
        { tanggal: { lt: new Date(startDate) } },
        'tanggal',
        'asc'
      )

      if (openingTransactions.length > 0) {
        const lastTransaction = openingTransactions[openingTransactions.length - 1]
        openingBalance = lastTransaction.saldo
      }
    }

    // Get main transactions
    const transactions = await getStockTransactions(
      barangId,
      gudangId,
      { tanggal: dateFilter },
      sortBy,
      sortOrder,
      transactionType
    )

    // Calculate running balance for each transaction
    let runningSaldo = openingBalance
    const transactionsWithSaldo = transactions.map(transaction => {
      if (transaction.type === 'masuk') {
        runningSaldo += transaction.qty
      } else {
        runningSaldo -= transaction.qty
      }
      return {
        ...transaction,
        saldo: runningSaldo,
      }
    })

    // Apply pagination
    const skip = (page - 1) * limit
    const paginatedTransactions = transactionsWithSaldo.slice(skip, skip + limit)
    const total = transactionsWithSaldo.length

    // Get stock information per warehouse
    const stockInfo = await prisma.stokBarang.findMany({
      where: { barangId },
      include: {
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
      },
    })

    const currentStock = stockInfo.reduce((sum, stock) => sum + stock.qty, 0)
    const selectedWarehouseStock = gudangId
      ? stockInfo.find(s => s.gudangId === gudangId)?.qty || 0
      : currentStock

    // Calculate statistics
    const stats = {
      openingBalance,
      currentStock: selectedWarehouseStock,
      totalMasuk: transactionsWithSaldo
        .filter(t => t.type === 'masuk')
        .reduce((sum, t) => sum + t.qty, 0),
      totalKeluar: transactionsWithSaldo
        .filter(t => t.type === 'keluar')
        .reduce((sum, t) => sum + t.qty, 0),
      totalNilaiMasuk: transactionsWithSaldo
        .filter(t => t.type === 'masuk')
        .reduce((sum, t) => sum + t.subtotal, 0),
      totalNilaiKeluar: transactionsWithSaldo
        .filter(t => t.type === 'keluar')
        .reduce((sum, t) => sum + t.subtotal, 0),
      transactionCount: transactionsWithSaldo.length,
      averageTransactionSize: transactionsWithSaldo.length > 0
        ? transactionsWithSaldo.reduce((sum, t) => sum + t.qty, 0) / transactionsWithSaldo.length
        : 0,
    }

    // Get available warehouses for filter
    const warehouses = await prisma.gudang.findMany({
      where: { aktif: true },
      select: {
        id: true,
        kode: true,
        nama: true,
      },
      orderBy: { nama: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        barang,
        transactions: paginatedTransactions,
        stockInfo,
        statistics: stats,
        warehouses,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        barangId,
        gudangId,
        startDate,
        endDate,
        transactionType,
      },
    })
  } catch (error) {
    console.error('Error fetching stock card:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to fetch stock card' },
      { status: 500 }
    )
  }
}

// Helper function to get stock transactions
async function getStockTransactions(
  barangId: string,
  gudangId?: string,
  dateFilter?: any,
  sortBy = 'tanggal',
  sortOrder = 'desc',
  transactionType: 'all' | 'masuk' | 'keluar' = 'all'
): Promise<StockTransaction[]> {
  const transactions: StockTransaction[] = []

  // Get Barang Masuk transactions
  if (transactionType === 'all' || transactionType === 'masuk') {
    const barangMasuk = await prisma.detailBarangMasuk.findMany({
      where: {
        barangId,
        barangMasuk: {
          tanggal: dateFilter,
          ...(gudangId && { gudangId }),
          status: { in: ['posted', 'completed'] },
        },
      },
      include: {
        barangMasuk: {
          include: {
            supplier: {
              select: { id: true, kode: true, nama: true },
            },
            gudang: {
              select: { id: true, kode: true, nama: true },
            },
          },
        },
      },
      orderBy: { barangMasuk: { [sortBy]: sortOrder } },
    })

    barangMasuk.forEach(detail => {
      transactions.push({
        id: detail.id,
        tanggal: detail.barangMasuk.tanggal,
        type: 'masuk',
        dokumentType: 'Barang Masuk',
        dokumentId: detail.barangMasukId,
        dokumentNo: detail.barangMasuk.noDokumen,
        qty: detail.qty,
        harga: Number(detail.harga),
        subtotal: Number(detail.subtotal),
        saldo: 0, // Will be calculated later
        keterangan: detail.barangMasuk.keterangan || undefined,
        supplier: detail.barangMasuk.supplier.nama,
        gudang: detail.barangMasuk.gudang.nama,
      })
    })
  }

  // Get Surat Jalan transactions (barang keluar)
  if (transactionType === 'all' || transactionType === 'keluar') {
    const suratJalan = await prisma.detailSuratJalan.findMany({
      where: {
        barangId,
        suratJalan: {
          tanggal: dateFilter,
          ...(gudangId && { gudangId }),
          status: { in: ['in_transit', 'delivered'] },
        },
      },
      include: {
        suratJalan: {
          include: {
            customer: {
              select: { id: true, kode: true, nama: true },
            },
            gudang: {
              select: { id: true, kode: true, nama: true },
            },
          },
        },
      },
      orderBy: { suratJalan: { [sortBy]: sortOrder } },
    })

    suratJalan.forEach(detail => {
      transactions.push({
        id: detail.id,
        tanggal: detail.suratJalan.tanggal,
        type: 'keluar',
        dokumentType: 'Surat Jalan',
        dokumentId: detail.suratJalanId,
        dokumentNo: detail.suratJalan.noSJ,
        qty: detail.qty,
        harga: Number(detail.hargaJual),
        subtotal: Number(detail.subtotal),
        saldo: 0, // Will be calculated later
        keterangan: detail.keterangan || detail.suratJalan.keterangan || undefined,
        customer: detail.suratJalan.customer.nama,
        gudang: detail.suratJalan.gudang.nama,
      })
    })
  }

  // Get Retur Beli transactions (barang keluar)
  if (transactionType === 'all' || transactionType === 'keluar') {
    const returBeli = await prisma.detailReturBeli.findMany({
      where: {
        barangId,
        returBeli: {
          tanggal: dateFilter,
          status: { in: ['approved', 'completed'] },
        },
      },
      include: {
        returBeli: {
          include: {
            supplier: {
              select: { id: true, kode: true, nama: true },
            },
          },
        },
      },
      orderBy: { returBeli: { [sortBy]: sortOrder } },
    })

    returBeli.forEach(detail => {
      transactions.push({
        id: detail.id,
        tanggal: detail.returBeli.tanggal,
        type: 'keluar',
        dokumentType: 'Retur Pembelian',
        dokumentId: detail.returBeliId,
        dokumentNo: detail.returBeli.noRetur,
        qty: detail.qty,
        harga: Number(detail.harga),
        subtotal: Number(detail.subtotal),
        saldo: 0, // Will be calculated later
        keterangan: detail.alasan || detail.returBeli.alasan || undefined,
        supplier: detail.returBeli.supplier.nama,
        referensi: detail.returBeli.barangMasukRef || undefined,
      })
    })
  }

  // Get Retur Jual transactions (barang masuk)
  if (transactionType === 'all' || transactionType === 'masuk') {
    const returJual = await prisma.detailReturJual.findMany({
      where: {
        barangId,
        returJual: {
          tanggal: dateFilter,
          status: { in: ['approved', 'completed'] },
        },
      },
      include: {
        returJual: {
          include: {
            customer: {
              select: { id: true, kode: true, nama: true },
            },
            suratJalan: {
              select: { id: true, noSJ: true },
            },
          },
        },
      },
      orderBy: { returJual: { [sortBy]: sortOrder } },
    })

    returJual.forEach(detail => {
      transactions.push({
        id: detail.id,
        tanggal: detail.returJual.tanggal,
        type: 'masuk',
        dokumentType: 'Retur Penjualan',
        dokumentId: detail.returJualId,
        dokumentNo: detail.returJual.noRetur,
        qty: detail.qty,
        harga: Number(detail.harga),
        subtotal: Number(detail.subtotal),
        saldo: 0, // Will be calculated later
        keterangan: detail.alasan || detail.returJual.alasan || undefined,
        customer: detail.returJual.customer.nama,
        referensi: detail.returJual.suratJalan?.noSJ || undefined,
      })
    })
  }

  // Sort transactions
  return transactions.sort((a, b) => {
    const aValue = sortBy === 'tanggal' ? a.tanggal.getTime() :
                   sortBy === 'type' ? a.type.charCodeAt(0) :
                   sortBy === 'qty' ? a.qty :
                   a.saldo
    const bValue = sortBy === 'tanggal' ? b.tanggal.getTime() :
                   sortBy === 'type' ? b.type.charCodeAt(0) :
                   sortBy === 'qty' ? b.qty :
                   b.saldo

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })
}