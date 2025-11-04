import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { suratJalanSchema } from '@/lib/validations'

// GET /api/transaksi/surat-jalan/[id] - Get single Surat Jalan by ID
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

    const suratJalan = await prisma.suratJalan.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
            telepon: true,
            email: true,
            tipePelanggan: true,
          },
        },
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
            telepon: true,
            pic: true,
          },
        },
        detail: {
          include: {
            barang: {
              select: {
                id: true,
                kode: true,
                nama: true,
                merk: true,
                tipe: true,
                ukuran: true,
                satuan: true,
                isDropship: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
      },
    })

    if (!suratJalan) {
      return NextResponse.json(
        { error: 'Surat Jalan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Get current stock for each item and supplier information if needed
    const itemsWithStock = await Promise.all(
      suratJalan.detail.map(async (item) => {
        // Skip stock check for custom items
        let stokBarang = null;
        if (!item.isCustom && item.barangId) {
          stokBarang = await prisma.stokBarang.findUnique({
            where: {
              barangId_gudangId: {
                barangId: item.barangId,
                gudangId: suratJalan.gudangId
              }
            }
          })
        }

        // Get supplier information if supplierId exists
        let supplier = null
        if (item.supplierId) {
          supplier = await prisma.supplier.findUnique({
            where: { id: item.supplierId },
            select: {
              id: true,
              kode: true,
              nama: true,
              alamat: true,
              telepon: true,
            }
          })
        }

        return {
          ...item,
          currentStock: item.isCustom ? null : (stokBarang?.qty || 0),
          stockStatus: item.isCustom ? 'custom_item' : (stokBarang ? (stokBarang.qty >= item.qty ? 'sufficient' : 'insufficient') : 'out_of_stock'),
          supplier
        }
      })
    )

    // Add calculated fields
    const suratJalanWithDetails = {
      ...suratJalan,
      detail: itemsWithStock,
      dropshipSummary: {
        totalItems: itemsWithStock.length,
        normalItems: itemsWithStock.filter(item => !item.isDropship && !item.isCustom).length,
        customItems: itemsWithStock.filter(item => item.isCustom).length,
        dropshipItems: itemsWithStock.filter(item => item.isDropship).length,
        readyItems: itemsWithStock.filter(item => !item.isDropship && (item.stockStatus === 'sufficient' || item.stockStatus === 'custom_item')).length,
        pendingDropship: itemsWithStock.filter(item => item.isDropship && item.statusDropship !== 'received').length,
        receivedDropship: itemsWithStock.filter(item => item.isDropship && item.statusDropship === 'received').length,
      }
    }

    return NextResponse.json({
      success: true,
      data: suratJalanWithDetails,
    })
  } catch (error) {
    console.error('Error fetching Surat Jalan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Surat Jalan' },
      { status: 500 }
    )
  }
}

// PUT /api/transaksi/surat-jalan/[id] - Update Surat Jalan
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
    if (!['admin', 'manager', 'staff_gudang', 'sales'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existingSJ = await prisma.suratJalan.findUnique({
      where: { id },
    })

    if (!existingSJ) {
      return NextResponse.json(
        { error: 'Surat Jalan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingSJ.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya Surat Jalan dengan status draft yang bisa diedit' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = suratJalanSchema.parse(body)

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 400 }
      )
    }

    // Check if warehouse exists
    const gudang = await prisma.gudang.findUnique({
      where: { id: validatedData.gudangId },
    })

    if (!gudang) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 400 }
      )
    }

    // Delete existing details
    await prisma.detailSuratJalan.deleteMany({
      where: { suratJalanId: id }
    })

    // Revalidate items and check stock/dropship
    const processedItems = await checkStockAndDropship(validatedData.items, validatedData.gudangId)

    // Calculate totals
    const totalQty = processedItems.reduce((sum, item) => sum + item.qty, 0)
    const totalNilai = processedItems.reduce((sum, item) => {
      const harga = item.isCustom ? (item.customHarga || 0) : (item.hargaJual || 0)
      return sum + (item.qty * harga)
    }, 0)

    const updatedSJ = await prisma.$transaction(async (tx) => {
      // Update Surat Jalan header
      const updated = await tx.suratJalan.update({
        where: { id },
        data: {
          tanggal: validatedData.tanggal,
          customerId: validatedData.customerId,
          gudangId: validatedData.gudangId,
          alamatKirim: validatedData.alamatKirim,
          namaSupir: validatedData.namaSupir,
          nopolKendaraan: validatedData.nopolKendaraan,
          keterangan: validatedData.keterangan,
          totalQty,
          totalNilai,
        },
        include: {
          customer: {
            select: {
              id: true,
              kode: true,
              nama: true,
              alamat: true,
              telepon: true,
            },
          },
          gudang: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
        },
      })

      // Create new details
      const detailPromises = processedItems.map((item) =>
        tx.detailSuratJalan.create({
          data: {
            suratJalanId: id,
            barangId: item.barangId,
            qty: item.qty,
            hargaJual: item.isCustom ? (item.customHarga || 0) : item.hargaJual,
            subtotal: item.qty * (item.isCustom ? (item.customHarga || 0) : item.hargaJual),
            satuan: item.isCustom ? item.customSatuan : item.satuan,
            isCustom: item.isCustom || false,
            customKode: item.isCustom ? item.customKode : null,
            customNama: item.isCustom ? item.customNama : null,
            customSatuan: item.isCustom ? item.customSatuan : null,
            customHarga: item.isCustom ? item.customHarga : null,
            isDropship: item.isDropship,
            supplierId: item.supplierId,
            statusDropship: item.statusDropship,
            keterangan: item.keterangan,
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
          },
        })
      )

      const details = await Promise.all(detailPromises)

      // Get supplier information for items with supplierId
      const detailsWithSuppliers = await Promise.all(
        details.map(async (detail, index) => {
          let supplier = null
          if (detail.supplierId) {
            supplier = await prisma.supplier.findUnique({
              where: { id: detail.supplierId },
              select: {
                id: true,
                kode: true,
                nama: true,
                alamat: true,
                telepon: true,
              }
            })
          }

          return {
            ...detail,
            currentStock: processedItems[index].currentStock,
            supplier,
            dropshipSupplier: processedItems[index].dropshipSupplier,
          }
        })
      )

      return {
        ...updated,
        detail: detailsWithSuppliers
      }
    })

    const dropshipItems = processedItems.filter(item => item.isDropship)
    let message = 'Surat Jalan berhasil diperbarui'

    if (dropshipItems.length > 0) {
      message += ` dengan ${dropshipItems.length} item dropship`
    }

    return NextResponse.json({
      success: true,
      data: updatedSJ,
      message,
      dropshipSummary: {
        totalItems: processedItems.length,
        normalItems: processedItems.filter(item => !item.isDropship).length,
        dropshipItems: dropshipItems.length,
        readyToShip: processedItems.filter(item => !item.isDropship).length > 0,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating Surat Jalan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update Surat Jalan' },
      { status: 500 }
    )
  }
}

// DELETE /api/transaksi/surat-jalan/[id] - Delete Surat Jalan
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
    if (!['admin', 'manager', 'staff_gudang'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const suratJalan = await prisma.suratJalan.findUnique({
      where: { id },
      include: {
        returJual: true,
      },
    })

    if (!suratJalan) {
      return NextResponse.json(
        { error: 'Surat Jalan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (suratJalan.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya Surat Jalan dengan status draft yang bisa dihapus' },
        { status: 400 }
      )
    }

    // Check if there are any retur transactions
    if (suratJalan.returJual.length > 0) {
      return NextResponse.json(
        { error: 'Tidak bisa menghapus Surat Jalan yang sudah ada retur' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Delete all details first
      await tx.detailSuratJalan.deleteMany({
        where: { suratJalanId: id }
      })

      // Delete the Surat Jalan
      await tx.suratJalan.delete({
        where: { id }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Surat Jalan berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting Surat Jalan:', error)
    return NextResponse.json(
      { error: 'Failed to delete Surat Jalan' },
      { status: 500 }
    )
  }
}

// Helper function - reusing from main route
async function checkStockAndDropship(items: any[], gudangId: string) {
  const processedItems = []

  for (const item of items) {
    if (item.isCustom) {
      // Custom item - no stock checking, no dropship
      processedItems.push({
        ...item,
        isDropship: false,
        supplierId: null,
        statusDropship: null,
        currentStock: null,
        barangId: null // Custom items don't have barangId
      })
    } else {
      // Warehouse item - check stock
      if (!item.barangId) {
        throw new Error('Barang ID wajib diisi untuk barang dari gudang')
      }

      // Get current stock for this item in the specified warehouse
      const stokBarang = await prisma.stokBarang.findUnique({
        where: {
          barangId_gudangId: {
            barangId: item.barangId,
            gudangId: gudangId
          }
        }
      })

      const currentStock = stokBarang?.qty || 0

      if (currentStock >= item.qty) {
        // Sufficient stock available
        processedItems.push({
          ...item,
          isDropship: false,
          supplierId: null,
          statusDropship: null,
          currentStock
        })
      } else {
        // Insufficient stock, check for dropship alternatives
        const supplierBarangs = await prisma.supplierBarang.findMany({
          where: {
            barangId: item.barangId,
            supplier: {
              aktif: true
            }
          },
          include: {
            supplier: {
              select: {
                id: true,
                kode: true,
                nama: true
              }
            }
          },
          orderBy: [
            { isPrimary: 'desc' },
            { leadTime: 'asc' }
          ]
        })

        if (supplierBarangs.length > 0) {
          // Found dropship supplier
          const primarySupplier = supplierBarangs[0]
          processedItems.push({
            ...item,
            isDropship: true,
            supplierId: primarySupplier.supplierId,
            statusDropship: 'pending',
            currentStock,
            dropshipSupplier: primarySupplier.supplier
          })
        } else {
          // No dropship supplier available
          throw new Error(`Stok tidak cukup dan tidak ada supplier dropship untuk barang ini`)
        }
      }
    }
  }

  return processedItems
}