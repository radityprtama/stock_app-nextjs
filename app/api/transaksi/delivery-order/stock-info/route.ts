import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET /api/transaksi/delivery-order/stock-info
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gudangId = searchParams.get('gudangId')
    const barangId = searchParams.get('barangId')

    // Get all warehouses with stock info
    const warehouses = await prisma.gudang.findMany({
      where: { aktif: true },
      include: {
        stokBarang: {
          include: {
            barang: {
              include: {
                golongan: true
              }
            }
          }
        },
        _count: {
          select: { stokBarang: true }
        }
      },
      orderBy: {
        nama: 'asc'
      }
    })

    // If specific warehouse is requested, get detailed stock info
    if (gudangId) {
      const warehouseStock = await prisma.stokBarang.findMany({
        where: {
          gudangId,
          barang: barangId ? { id: barangId } : undefined
        },
        include: {
          barang: {
            include: {
              golongan: true
            }
          }
        },
        orderBy: {
          barang: {
            nama: 'asc'
          }
        }
      })

      const formattedStock = warehouseStock.map(stock => ({
        id: stock.id,
        barangId: stock.barang.id,
        barangKode: stock.barang.kode,
        barangNama: stock.barang.nama,
        barangMerk: stock.barang.merk,
        barangTipe: stock.barang.tipe,
        barangUkuran: stock.barang.ukuran,
        satuan: stock.barang.satuan,
        golongan: stock.barang.golongan.nama,
        stok: stock.qty,
        minStok: stock.barang.minStok,
        maxStok: stock.barang.maxStok,
        hargaJual: stock.barang.hargaJual
      }))

      return NextResponse.json({
        success: true,
        data: formattedStock,
        warehouse: warehouses.find(w => w.id === gudangId)
      })
    }

    // Return all warehouses with basic stock summary
    const formattedWarehouses = warehouses.map(warehouse => ({
      id: warehouse.id,
      kode: warehouse.kode,
      nama: warehouse.nama,
      alamat: warehouse.alamat,
      totalItems: warehouse._count.stokBarang,
      totalStock: warehouse.stokBarang.reduce((sum, stock) => sum + stock.qty, 0)
    }))

    return NextResponse.json({
      success: true,
      data: formattedWarehouses
    })

  } catch (error) {
    console.error('Error fetching delivery order stock info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}