import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface MutationQuery {
  gudangId?: string;
  barangId?: string;
  startDate?: string;
  endDate?: string;
  tipeMutasi?: string;
  page?: string;
  limit?: string;
}

interface MutationReportItem {
  id: string;
  tanggal: Date;
  tipeMutasi: string;
  barang: {
    id: string;
    kode: string;
    nama: string;
    golongan?: {
      nama: string;
    };
  };
  gudang: {
    id: string;
    kode: string;
    nama: string;
  };
  qtyIn: number;
  qtyOut: number;
  saldoAwal: number;
  saldoAkhir: number;
  referensiType?: string;
  referensiId?: string;
  keterangan?: string;
  harga?: number;
}

interface CombinedMutation {
  id: string;
  tanggal: Date;
  tipeMutasi: string;
  barang: {
    id: string;
    kode: string;
    nama: string;
    golongan?: {
      nama: string;
    } | null;
  } | null;
  gudang: {
    id: string;
    kode: string;
    nama: string;
  };
  qtyIn: number;
  qtyOut: number;
  saldoAwal: number;
  saldoAkhir: number;
  referensiType?: string | null;
  referensiId?: string | null;
  keterangan?: string | null;
  harga?: number | null;
}

// GET stock mutation report with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries()) as MutationQuery;

    const {
      gudangId,
      barangId,
      startDate,
      endDate,
      tipeMutasi,
      page = "1",
      limit = "50",
    } = params;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const mutations: CombinedMutation[] = [];

    // Get Barang Masuk (stock in)
    if (!tipeMutasi || tipeMutasi === 'masuk') {
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
        orderBy: { tanggal: 'desc' }
      });

      barangMasuk.forEach(bm => {
        bm.detail.forEach(detail => {
          if ((!barangId || detail.barangId === barangId) && detail.barang) {
            mutations.push({
              id: `bm-${bm.id}-${detail.id}`,
              tanggal: bm.tanggal,
              tipeMutasi: 'masuk',
              barang: detail.barang,
              gudang: bm.gudang,
              qtyIn: detail.qty || 0,
              qtyOut: 0,
              saldoAwal: 0, // Would need running balance calculation
              saldoAkhir: 0, // Would need running balance calculation
              referensiType: 'Barang Masuk',
              referensiId: bm.noDokumen,
              keterangan: bm.keterangan || `Dari ${bm.supplier?.nama || 'Supplier'}`,
              harga: detail.harga ? Number(detail.harga) : undefined,
            });
          }
        });
      });
    }

    // Get Surat Jalan (stock out)
    if (!tipeMutasi || tipeMutasi === 'keluar') {
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
        orderBy: { tanggal: 'desc' }
      });

      suratJalan.forEach(sj => {
        sj.detail.forEach(detail => {
          if ((!barangId || detail.barangId === barangId) && !detail.isDropship && detail.barang) {
            mutations.push({
              id: `sj-${sj.id}-${detail.id}`,
              tanggal: sj.tanggalKirim || sj.tanggal,
              tipeMutasi: 'keluar',
              barang: detail.barang,
              gudang: sj.gudang,
              qtyIn: 0,
              qtyOut: detail.qty || 0,
              saldoAwal: 0, // Would need running balance calculation
              saldoAkhir: 0, // Would need running balance calculation
              referensiType: 'Surat Jalan',
              referensiId: sj.noSJ,
              keterangan: `Ke ${sj.customer?.nama || 'Customer'}`,
              harga: detail.hargaJual ? Number(detail.hargaJual) : undefined,
            });
          }
        });
      });
    }

    // Sort mutations by date (most recent first)
    mutations.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    // Apply pagination
    const total = mutations.length;
    const paginatedMutations = mutations.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum
    );

    // Format response
    const formattedMutations: MutationReportItem[] = paginatedMutations
      .filter(mutation => mutation.barang) // Filter out null barang
      .map((mutation) => ({
        id: mutation.id,
        tanggal: mutation.tanggal,
        tipeMutasi: mutation.tipeMutasi,
        barang: {
          id: mutation.barang!.id,
          kode: mutation.barang!.kode,
          nama: mutation.barang!.nama,
          golongan: mutation.barang!.golongan
            ? { nama: mutation.barang!.golongan.nama }
            : undefined,
        },
        gudang: {
          id: mutation.gudang.id,
          kode: mutation.gudang.kode,
          nama: mutation.gudang.nama,
        },
        qtyIn: mutation.qtyIn,
        qtyOut: mutation.qtyOut,
        saldoAwal: mutation.saldoAwal,
        saldoAkhir: mutation.saldoAkhir,
        referensiType: mutation.referensiType || undefined,
        referensiId: mutation.referensiId || undefined,
        keterangan: mutation.keterangan || undefined,
        harga: mutation.harga || undefined,
      }));

    // Calculate summary statistics
    const totalMasuk = formattedMutations.reduce(
      (sum, item) => sum + item.qtyIn,
      0
    );
    const totalKeluar = formattedMutations.reduce(
      (sum, item) => sum + item.qtyOut,
      0
    );
    const netMutation = totalMasuk - totalKeluar;

    // Group by mutation type
    const mutationByType = formattedMutations.reduce(
      (acc, item) => {
        if (!acc[item.tipeMutasi]) {
          acc[item.tipeMutasi] = { count: 0, totalIn: 0, totalOut: 0 };
        }
        acc[item.tipeMutasi].count++;
        acc[item.tipeMutasi].totalIn += item.qtyIn;
        acc[item.tipeMutasi].totalOut += item.qtyOut;
        return acc;
      },
      {} as Record<string, { count: number; totalIn: number; totalOut: number }>
    );

    return NextResponse.json({
      data: {
        mutations: formattedMutations,
        summary: {
          totalMutations: total,
          totalMasuk,
          totalKeluar,
          netMutation,
          mutationByType,
        },
        filters: {
          gudangId: gudangId || null,
          barangId: barangId || null,
          tipeMutasi: tipeMutasi || null,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      success: true,
    });
  } catch (error: unknown) {
    console.error("Error generating mutation report:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to generate mutation report",
        details: errorMessage,
        success: false,
      },
      { status: 500 }
    );
  }
}

// Export mutations to Excel/CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format = "excel", filters = {} } = body;

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (filters.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      dateFilter.lte = new Date(filters.endDate + 'T23:59:59.999Z');
    }

    const mutations: CombinedMutation[] = [];

    // Get all Barang Masuk (no pagination)
    if (!filters.tipeMutasi || filters.tipeMutasi === 'masuk') {
      const barangMasuk = await prisma.barangMasuk.findMany({
        where: {
          status: 'posted',
          ...(Object.keys(dateFilter).length > 0 && { tanggal: dateFilter }),
          ...(filters.gudangId && { gudangId: filters.gudangId }),
          ...(filters.barangId && {
            detail: {
              some: { barangId: filters.barangId }
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
        orderBy: { tanggal: 'desc' }
      });

      barangMasuk.forEach(bm => {
        bm.detail.forEach(detail => {
          if ((!filters.barangId || detail.barangId === filters.barangId) && detail.barang) {
            mutations.push({
              id: `bm-${bm.id}-${detail.id}`,
              tanggal: bm.tanggal,
              tipeMutasi: 'masuk',
              barang: detail.barang,
              gudang: bm.gudang,
              qtyIn: detail.qty || 0,
              qtyOut: 0,
              saldoAwal: 0,
              saldoAkhir: 0,
              referensiType: 'Barang Masuk',
              referensiId: bm.noDokumen,
              keterangan: bm.keterangan || `Dari ${bm.supplier?.nama || 'Supplier'}`,
              harga: detail.harga ? Number(detail.harga) : undefined,
            });
          }
        });
      });
    }

    // Get all Surat Jalan (no pagination)
    if (!filters.tipeMutasi || filters.tipeMutasi === 'keluar') {
      const suratJalan = await prisma.suratJalan.findMany({
        where: {
          status: { in: ['in_transit', 'delivered'] },
          ...(Object.keys(dateFilter).length > 0 && {
            OR: [
              { tanggalKirim: dateFilter },
              { createdAt: dateFilter }
            ]
          }),
          ...(filters.gudangId && { gudangId: filters.gudangId }),
          ...(filters.barangId && {
            detail: {
              some: {
                barangId: filters.barangId,
                isDropship: false
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
        orderBy: { tanggal: 'desc' }
      });

      suratJalan.forEach(sj => {
        sj.detail.forEach(detail => {
          if ((!filters.barangId || detail.barangId === filters.barangId) && !detail.isDropship && detail.barang) {
            mutations.push({
              id: `sj-${sj.id}-${detail.id}`,
              tanggal: sj.tanggalKirim || sj.tanggal,
              tipeMutasi: 'keluar',
              barang: detail.barang,
              gudang: sj.gudang,
              qtyIn: 0,
              qtyOut: detail.qty || 0,
              saldoAwal: 0,
              saldoAkhir: 0,
              referensiType: 'Surat Jalan',
              referensiId: sj.noSJ,
              keterangan: `Ke ${sj.customer?.nama || 'Customer'}`,
              harga: detail.hargaJual ? Number(detail.hargaJual) : undefined,
            });
          }
        });
      });
    }

    // Sort by date
    mutations.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    // Format for export
    const exportData = mutations
      .filter(mutation => mutation.barang) // Filter out null barang
      .map((mutation) => ({
        Tanggal: new Date(mutation.tanggal).toLocaleString("id-ID"),
        "Tipe Mutasi": mutation.tipeMutasi === 'masuk' ? 'Barang Masuk' : 'Barang Keluar',
        "Kode Barang": mutation.barang!.kode,
        "Nama Barang": mutation.barang!.nama,
        Golongan: mutation.barang!.golongan?.nama || "",
        Gudang: mutation.gudang.nama,
        "Qty Masuk": mutation.qtyIn,
        "Qty Keluar": mutation.qtyOut,
        "Saldo Awal": mutation.saldoAwal,
        "Saldo Akhir": mutation.saldoAkhir,
        "Referensi": `${mutation.referensiType || ""} ${mutation.referensiId || ""}`.trim(),
        Keterangan: mutation.keterangan || "",
        Harga: mutation.harga || "",
      }));

    return NextResponse.json({
      data: {
        exportData,
        totalRows: exportData.length,
        format,
      },
      success: true,
      message: "Data ready for export",
    });
  } catch (error: unknown) {
    console.error("Error exporting mutation report:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to export mutation report",
        details: errorMessage,
        success: false,
      },
      { status: 500 }
    );
  }
}