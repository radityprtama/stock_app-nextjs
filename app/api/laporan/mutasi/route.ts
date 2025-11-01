import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// GET /api/laporan/mutasi
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const barangId = searchParams.get('barangId') || ''
    const gudangId = searchParams.get('gudangId') || ''
    const jenisTransaksi = searchParams.get('jenisTransaksi') || '' // MASUK, KELUAR

    // Build date filter
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate + 'T23:59:59.999Z')
    }

    const mutations: any[] = []

    // Get Barang Masuk (stock in)
    if (!jenisTransaksi || jenisTransaksi === 'MASUK') {
      const barangMasuk = await prisma.barangMasuk.findMany({
        where: {
          status: 'posted',
          ...(Object.keys(dateFilter).length > 0 && { tanggal: dateFilter }),
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
        orderBy: { tanggal: 'asc' }
      })

      barangMasuk.forEach(bm => {
        bm.detail.forEach(detail => {
          if (!barangId || detail.barangId === barangId) {
            mutations.push({
              tanggal: bm.tanggal,
              jenis: 'MASUK',
              noDokumen: bm.noDokumen,
              barang: detail.barang,
              gudang: bm.gudang,
              qty: detail.qty,
              harga: parseFloat(detail.harga.toString()),
              nilai: parseFloat(detail.subtotal.toString()),
              keterangan: `Dari ${bm.supplier.nama}`,
              createdAt: bm.createdAt
            })
          }
        })
      })
    }

    // Get Surat Jalan (stock out)
    if (!jenisTransaksi || jenisTransaksi === 'KELUAR') {
      const suratJalan = await prisma.suratJalan.findMany({
        where: {
          status: { in: ['in_transit', 'delivered'] },
          ...(Object.keys(dateFilter).length > 0 && {
            OR: [
              { tanggalKirim: dateFilter },
              { createdAt: dateFilter }
            ]
          }),
          ...(gudangId && { gudangId }),
          ...(barangId && {
            detail: {
              some: {
                barangId,
                isDropship: false // Exclude dropship items from stock mutations
              }
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
        orderBy: { tanggal: 'asc' }
      })

      suratJalan.forEach(sj => {
        sj.detail.forEach(detail => {
          if ((!barangId || detail.barangId === barangId) && !detail.isDropship) {
            mutations.push({
              tanggal: sj.tanggalKirim || sj.tanggal,
              jenis: 'KELUAR',
              noDokumen: sj.noSJ,
              barang: detail.barang,
              gudang: sj.gudang,
              qty: -detail.qty, // Negative for stock out
              harga: parseFloat(detail.hargaJual.toString()),
              nilai: -parseFloat(detail.subtotal.toString()), // Negative for stock out
              keterangan: `Ke ${sj.customer.nama}`,
              createdAt: sj.createdAt
            })
          }
        })
      })
    }

    // Get Retur Beli (stock out)
    if (!jenisTransaksi || jenisTransaksi === 'KELUAR') {
      const returBeli = await prisma.returBeli.findMany({
        where: {
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 && { tanggal: dateFilter }),
          ...(barangId && {
            detail: {
              some: { barangId }
            }
          })
        },
        include: {
          supplier: true,
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
        orderBy: { tanggal: 'asc' }
      })

      returBeli.forEach(rb => {
        rb.detail.forEach(detail => {
          if (!barangId || detail.barangId === barangId) {
            mutations.push({
              tanggal: rb.tanggal,
              jenis: 'KELUAR',
              noDokumen: rb.noRetur,
              barang: detail.barang,
              gudang: null, // Retur beli doesn't specify gudang, affects stock globally
              qty: -detail.qty,
              harga: parseFloat(detail.harga.toString()),
              nilai: -parseFloat(detail.subtotal.toString()),
              keterangan: `Retur ke ${rb.supplier.nama} - ${detail.alasan}`,
              createdAt: rb.createdAt
            })
          }
        })
      })
    }

    // Get Retur Jual (stock in)
    if (!jenisTransaksi || jenisTransaksi === 'MASUK') {
      const returJual = await prisma.returJual.findMany({
        where: {
          status: 'completed',
          ...(Object.keys(dateFilter).length > 0 && { tanggal: dateFilter }),
          ...(gudangId && {
            suratJalan: {
              gudangId
            }
          }),
          ...(barangId && {
            detail: {
              some: { barangId }
            }
          })
        },
        include: {
          customer: true,
          suratJalan: {
            include: { gudang: true }
          },
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
        orderBy: { tanggal: 'asc' }
      })

      returJual.forEach(rj => {
        rj.detail.forEach(detail => {
          if (!barangId || detail.barangId === barangId) {
            // Only add stock if condition is "bisa_dijual_lagi"
            if (detail.kondisi === 'bisa_dijual_lagi') {
              mutations.push({
                tanggal: rj.tanggal,
                jenis: 'MASUK',
                noDokumen: rj.noRetur,
                barang: detail.barang,
                gudang: rj.suratJalan?.gudang || null,
                qty: detail.qty,
                harga: parseFloat(detail.harga.toString()),
                nilai: parseFloat(detail.subtotal.toString()),
                keterangan: `Retur dari ${rj.customer.nama} - ${detail.alasan}`,
                createdAt: rj.createdAt
              })
            }
          }
        })
      })
    }

    // Sort mutations by date
    mutations.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())

    // Calculate running balance for each barang-gudang combination
    const balances: Record<string, number> = {}

    const mutationsWithBalance = mutations.map(mutation => {
      const key = `${mutation.barang.id}-${mutation.gudang?.id || 'global'}`

      // Initialize balance if not exists
      if (!(key in balances)) {
        balances[key] = 0
      }

      // Update balance
      balances[key] += mutation.qty

      return {
        ...mutation,
        saldo: balances[key]
      }
    })

    // Summary statistics
    const summary = {
      totalMutations: mutationsWithBalance.length,
      totalMasuk: mutations.filter(m => m.jenis === 'MASUK').reduce((sum, m) => sum + m.qty, 0),
      totalKeluar: Math.abs(mutations.filter(m => m.jenis === 'KELUAR').reduce((sum, m) => sum + m.qty, 0)),
      totalNilaiMasuk: mutations.filter(m => m.jenis === 'MASUK').reduce((sum, m) => sum + m.nilai, 0),
      totalNilaiKeluar: Math.abs(mutations.filter(m => m.jenis === 'KELUAR').reduce((sum, m) => sum + m.nilai, 0)),
      filters: {
        startDate,
        endDate,
        barangId,
        gudangId,
        jenisTransaksi
      }
    }

    const report = {
      summary,
      data: mutationsWithBalance,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating mutation report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}