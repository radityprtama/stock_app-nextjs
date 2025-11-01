import React, { forwardRef, useImperativeHandle } from 'react'
import { useReactToPrint } from 'react-to-print'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
type ReturBeliPrintItem = {
  id: string
  barangId?: string
  barang: {
    nama: string
    satuan: string
    ukuran?: string | null
    tipe?: string | null
    merk?: string | null
  }
  qty: number
  harga: number | string
  subtotal: number | string
  alasan: string
}

export interface ReturBeliPrintData {
  id: string
  noRetur: string
  tanggal: string | Date
  status: string
  supplier: {
    nama: string
    alamat: string
    telepon: string
    email?: string | null
    npwp?: string | null
  }
  barangMasukRef?: string | null
  detail: ReturBeliPrintItem[]
  alasan: string
  createdBy?: string | null
}

interface ReturBeliPrintProps {
  data: ReturBeliPrintData
  onPrintComplete?: () => void
}

export interface ReturBeliPrintRef {
  print: () => void
}

const ReturBeliPrint = forwardRef<ReturBeliPrintRef, ReturBeliPrintProps>(
  ({ data, onPrintComplete }, ref) => {
  const componentRef = React.useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Retur Pembelian - ${data.noRetur}`,
    onAfterPrint: () => {
      onPrintComplete?.()
    },
    pageStyle: `
      @page {
        margin: 15mm;
        size: A4;
      }
      @media print {
        body { print-color-adjust: exact; }
      }
    `
  })

  useImperativeHandle(ref, () => ({
    print: handlePrint
  }))

  const calculateTotal = () => {
    return data.detail.reduce((total, item) => total + Number(item.subtotal), 0)
  }

  const calculateTotalQty = () => {
    return data.detail.reduce((total, item) => total + item.qty, 0)
  }

  return (
    <div className="print-container">
      <div ref={componentRef} className="print-preview">
        {/* Company Header */}
        <div className="company-header">
          <div className="company-name">PT. Stocky INDONESIA</div>
          <div className="company-address">Jl. Raya No. 123, Jakarta Selatan</div>
          <div className="company-contact">Telp: (021) 1234-5678 | Email: info@Stocky.com</div>
        </div>

        {/* Document Title */}
        <div className="document-title">SURAT RETUR PEMBELIAN</div>

        {/* Return Header */}
        <div className="retur-header">
          <p className="title">Nomor: {data.noRetur}</p>
          <p>Tanggal: {format(new Date(data.tanggal), 'dd MMMM yyyy', { locale: id })}</p>
        </div>

        {/* Supplier Information */}
        <div className="document-info">
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Kepada:</span>
              <span className="info-value">{data.supplier.nama}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Alamat:</span>
              <span className="info-value">{data.supplier.alamat}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Telepon:</span>
              <span className="info-value">{data.supplier.telepon}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{data.supplier.email || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">NPWP:</span>
              <span className="info-value">{data.supplier.npwp || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status Retur:</span>
              <span className="info-value">
                {data.status === 'draft' ? 'Draft' :
                 data.status === 'approved' ? 'Disetujui' :
                 data.status === 'completed' ? 'Selesai' : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Reference */}
        {data.barangMasukRef && (
          <div className="document-info">
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Referensi BM:</span>
                <span className="info-value">{data.barangMasukRef}</span>
              </div>
            </div>
          </div>
        )}

        {/* Return Reason */}
        <div className="notes-section" style={{ backgroundColor: '#f8d7da', borderColor: '#f5c6cb' }}>
          <div className="notes-title">ALASAN RETUR:</div>
          <div className="notes-content">{data.alasan}</div>
        </div>

        {/* Items Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Barang</th>
              <th>Alasan Retur</th>
              <th>Qty</th>
              <th>Satuan</th>
              <th>Harga</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.detail.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>
                  <div className="bold">{item.barang.nama}</div>
                  {item.barang.ukuran && (
                    <div className="text-sm">Ukuran: {item.barang.ukuran}</div>
                  )}
                  {item.barang.tipe && (
                    <div className="text-sm">Tipe: {item.barang.tipe}</div>
                  )}
                  {item.barang.merk && (
                    <div className="text-sm">Merk: {item.barang.merk}</div>
                  )}
                </td>
                <td>
                  <span className="text-danger">{item.alasan}</span>
                </td>
                <td className="center">{item.qty}</td>
                <td className="center">{item.barang.satuan}</td>
                <td className="number">
                  Rp {Number(item.harga).toLocaleString('id-ID')}
                </td>
                <td className="number">
                  Rp {Number(item.subtotal).toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="summary-row">
              <td colSpan={3} className="bold">TOTAL RETUR</td>
              <td className="center bold">{calculateTotalQty()}</td>
              <td>-</td>
              <td className="number">
                Rp {calculateTotal().toLocaleString('id-ID')}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Additional Notes */}
        <div className="notes-section">
          <div className="notes-title">KETERANGAN TAMBAHAN:</div>
          <div className="notes-content">
            1. Barang-barang di atas dikembalikan karena alasan yang disebutkan<br />
            2. Mohon periksa kembali kondisi barang yang dikembalikan<br />
            3. Pengembalian ini telah disetujui oleh pihak manajemen<br />
            4. Dokumen ini sebagai bukti pengembalian yang sah
          </div>
        </div>

        {/* Signature Section */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-title">Menyetujui</div>
            <div className="signature-line"></div>
            <div className="signature-name">
              {data.status === 'approved' || data.status === 'completed' ?
                'Management' : '________________'}
            </div>
          </div>

          <div className="signature-box">
            <div className="signature-title">Supplier</div>
            <div className="signature-line"></div>
            <div className="signature-name">
              {data.supplier.nama}
            </div>
          </div>

          <div className="signature-box">
            <div className="signature-title">Admin Gudang</div>
            <div className="signature-line"></div>
            <div className="signature-name">
              {data.createdBy ? 'Admin' : '________________'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="document-footer">
          Dokumen ini adalah bukti retur pembelian yang sah dan harus ditandatangani oleh pihak terkait.
          <br />
          Dokumen ini dicetak pada {format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: id })}
        </div>
      </div>
    </div>
  )
})

ReturBeliPrint.displayName = 'ReturBeliPrint'

export default ReturBeliPrint
