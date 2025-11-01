import React, { forwardRef, useImperativeHandle } from 'react'
import { useReactToPrint } from 'react-to-print'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import type { DeliveryOrderWithDetails } from '@/src/types'

interface DeliveryOrderPrintProps {
  data: DeliveryOrderWithDetails
  onPrintComplete?: () => void
}

export interface DeliveryOrderPrintRef {
  print: () => void
}

const DeliveryOrderPrint = forwardRef<DeliveryOrderPrintRef, DeliveryOrderPrintProps>(
  ({ data, onPrintComplete }, ref) => {
  const componentRef = React.useRef<HTMLDivElement | null>(null)

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Delivery Order - ${data.noDO}`,
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
        <div className="document-title">DELIVERY ORDER</div>

        {/* Document Number and Date */}
        <div className="delivery-order-info">
          <div className="delivery-order-title">
            Nomor: {data.noDO}
          </div>
          <div className="info-row" style={{ marginTop: '10px' }}>
            <span className="info-label">Tanggal:</span>
            <span className="info-value">
              {format(new Date(data.tanggal), 'dd MMMM yyyy', { locale: id })}
            </span>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="document-info">
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Gudang Asal:</span>
              <span className="info-value">{data.gudangAsal.nama}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Gudang Tujuan:</span>
              <span className="info-value">{data.gudangTujuan}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Alamat Gudang Asal:</span>
              <span className="info-value">{data.gudangAsal.alamat}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Telepon Gudang:</span>
              <span className="info-value">{data.gudangAsal.telepon || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">PIC Gudang:</span>
              <span className="info-value">{data.gudangAsal.pic || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Nama Supir:</span>
              <span className="info-value">{data.namaSupir}</span>
            </div>
            <div className="info-row">
              <span className="info-label">No. Polisi:</span>
              <span className="info-value">{data.nopolKendaraan}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value">
                {data.status === 'draft' ? 'Draft' :
                 data.status === 'in_transit' ? 'Dalam Perjalanan' :
                 data.status === 'delivered' ? 'Terkirim' : 'Dibatalkan'}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Barang</th>
              <th>Satuan</th>
              <th>Qty</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {data.detail.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td className="bold">{item.namaBarang}</td>
                <td className="center">{item.satuan}</td>
                <td className="center">{item.qty}</td>
                <td>{item.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="summary-row">
              <td colSpan={3} className="bold">TOTAL</td>
              <td className="center bold">{calculateTotalQty()}</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>

        {/* Notes */}
        {data.keterangan && (
          <div className="notes-section">
            <div className="notes-title">KETERANGAN:</div>
            <div className="notes-content">{data.keterangan}</div>
          </div>
        )}

        {/* Timeline Information */}
        <div className="document-info" style={{ marginTop: '20px' }}>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Tanggal Berangkat:</span>
              <span className="info-value">
                {data.tanggalBerangkat ?
                  format(new Date(data.tanggalBerangkat), 'dd MMMM yyyy HH:mm', { locale: id }) :
                  'Belum berangkat'
                }
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Tanggal Sampai:</span>
              <span className="info-value">
                {data.tanggalSampai ?
                  format(new Date(data.tanggalSampai), 'dd MMMM yyyy HH:mm', { locale: id }) :
                  'Belum sampai'
                }
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Dibuat Oleh:</span>
              <span className="info-value">Admin System</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tanggal Dibuat:</span>
              <span className="info-value">
                {format(new Date(data.createdAt), 'dd MMMM yyyy HH:mm', { locale: id })}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="signature-section">
          <div className="signature-box">
            <div className="signature-title">Gudang Asal</div>
            <div className="signature-line"></div>
            <div className="signature-name">
              {data.gudangAsal.pic || '________________'}
            </div>
          </div>

          <div className="signature-box">
            <div className="signature-title">Supir</div>
            <div className="signature-line"></div>
            <div className="signature-name">{data.namaSupir}</div>
          </div>

          <div className="signature-box">
            <div className="signature-title">Penerima</div>
            <div className="signature-line"></div>
            <div className="signature-name">________________</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="notes-section" style={{ backgroundColor: '#fff3cd', borderColor: '#ffeaa7' }}>
          <div className="notes-title">PETUNJUK:</div>
          <div className="notes-content">
            1. Periksa semua barang sesuai dengan daftar di atas<br />
            2. Pastikan kondisi barang baik saat diterima<br />
            3. Tanda tangani dokumen ini sebagai bukti serah terima<br />
            4. Laporkan segera jika ada barang yang rusak atau tidak sesuai
          </div>
        </div>

        {/* Footer */}
        <div className="document-footer">
          Dokumen ini adalah bukti pengiriman antar gudang yang sah dan harus ditandatangani oleh pihak terkait.
          <br />
          Dokumen ini dicetak pada {format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: id })}
        </div>
      </div>
    </div>
  )
})

DeliveryOrderPrint.displayName = 'DeliveryOrderPrint'

export default DeliveryOrderPrint
