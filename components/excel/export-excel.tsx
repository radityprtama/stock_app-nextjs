'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Eye,
  Settings,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface ColumnDefinition {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean'
  format?: string
  visible: boolean
}

interface ExportExcelProps {
  open: boolean
  onClose: () => void
  data: any[]
  title: string
  description: string
  columns: ColumnDefinition[]
  filename?: string
  onExport?: (selectedColumns: string[], filters: any) => Promise<any[]>
}

interface ExportFilters {
  dateRange: {
    start: string
    end: string
  }
  status: string
  search: string
}

export default function ExportExcel({
  open,
  onClose,
  data,
  title,
  description,
  columns,
  filename,
  onExport,
}: ExportExcelProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.filter(col => col.visible).map(col => col.key)
  )
  const [filters, setFilters] = useState<ExportFilters>({
    dateRange: {
      start: '',
      end: '',
    },
    status: '',
    search: '',
  })
  const [isExporting, setIsExporting] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns([...selectedColumns, columnKey])
    } else {
      setSelectedColumns(selectedColumns.filter(key => key !== columnKey))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedColumns(columns.map(col => col.key))
    } else {
      setSelectedColumns([])
    }
  }

  const formatCellValue = (value: any, column: ColumnDefinition): string => {
    if (value === null || value === undefined || value === '') {
      return ''
    }

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(Number(value))

      case 'number':
        return Number(value).toLocaleString('id-ID')

      case 'date':
        try {
          return format(new Date(value), 'dd MMM yyyy', { locale: id })
        } catch {
          return String(value)
        }

      case 'boolean':
        return value ? 'Ya' : 'Tidak'

      default:
        return String(value)
    }
  }

  const generatePreview = () => {
    if (data.length === 0) return

    const previewColumns = columns.filter(col => selectedColumns.includes(col.key))
    const preview = data.slice(0, 5).map(row => {
      const previewRow: any = {}
      previewColumns.forEach(col => {
        previewRow[col.key] = formatCellValue(row[col.key], col)
      })
      return previewRow
    })

    setPreviewData(preview)
    setShowPreview(true)
  }

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast.error('Pilih minimal 1 kolom untuk diekspor')
      return
    }

    setIsExporting(true)

    try {
      // Use provided onExport function or use existing data
      let exportData = data
      if (onExport) {
        exportData = await onExport(selectedColumns, filters)
      }

      if (exportData.length === 0) {
        toast.error('Tidak ada data untuk diekspor')
        return
      }

      // Filter and format data
      const exportColumns = columns.filter(col => selectedColumns.includes(col.key))
      const formattedData = exportData.map(row => {
        const formattedRow: any = {}
        exportColumns.forEach(col => {
          formattedRow[col.label] = formatCellValue(row[col.key], col)
        })
        return formattedRow
      })

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(formattedData)

      // Set column widths
      const columnWidths = exportColumns.map(col => ({
        wch: Math.max(col.label.length, 15) // Minimum width of 15
      }))
      worksheet['!cols'] = columnWidths

      // Create workbook
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, title)

      // Generate filename
      const defaultFilename = `${filename || title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`

      // Export file
      XLSX.writeFile(workbook, defaultFilename)

      toast.success(`Berhasil mengekspor ${formattedData.length} data ke Excel`)

      // Close dialog after a delay
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      toast.error('Gagal mengekspor data. Silakan coba lagi.')
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const resetForm = () => {
    setSelectedColumns(columns.filter(col => col.visible).map(col => col.key))
    setFilters({
      dateRange: { start: '', end: '' },
      status: '',
      search: '',
    })
    setPreviewData([])
    setShowPreview(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const visibleColumns = columns.filter(col => col.visible)
  const allSelected = selectedColumns.length === visibleColumns.length
  const someSelected = selectedColumns.length > 0 && selectedColumns.length < visibleColumns.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            Export Excel - {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Column Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Pilih Kolom
              </CardTitle>
              <CardDescription>
                Pilih kolom yang ingin disertakan dalam file Excel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="font-medium">
                    Pilih Semua ({visibleColumns.length})
                  </Label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {columns.map((column) => (
                    <div key={column.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.key}
                        checked={selectedColumns.includes(column.key)}
                        onCheckedChange={(checked) => handleColumnToggle(column.key, checked as boolean)}
                        disabled={!column.visible}
                      />
                      <Label
                        htmlFor={column.key}
                        className={`text-sm ${!column.visible ? 'text-gray-400' : ''}`}
                      >
                        {column.label}
                        <span className="text-xs text-gray-500 ml-1">
                          ({column.type})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{selectedColumns.length}</span> kolom dipilih
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters (Optional) */}
          {false && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Filter Data
                </CardTitle>
                <CardDescription>
                  Filter data sebelum diekspor (opsional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="start-date">Tanggal Mulai</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Tanggal Akhir</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Semua Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Semua Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="posted">Posted</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="search">Pencarian</Label>
                    <Input
                      id="search"
                      placeholder="Cari data..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview */}
          {selectedColumns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center">
                    <Eye className="mr-2 h-5 w-5" />
                    Preview Data
                  </span>
                  <Button variant="outline" size="sm" onClick={generatePreview}>
                    {showPreview ? 'Refresh Preview' : 'Generate Preview'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Preview 5 baris pertama dari data yang akan diekspor
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showPreview && previewData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns
                            .filter(col => selectedColumns.includes(col.key))
                            .map((col) => (
                              <TableHead key={col.key}>{col.label}</TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, index) => (
                          <TableRow key={index}>
                            {columns
                              .filter(col => selectedColumns.includes(col.key))
                              .map((col) => (
                                <TableCell key={col.key}>
                                  {row[col.label] || '-'}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-12 w-12 mx-auto mb-2" />
                    <p>Klik "Generate Preview" untuk melihat preview data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Export Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{data.length.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Data</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{selectedColumns.length}</p>
                  <p className="text-sm text-gray-600">Kolom Dipilih</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {data.length > 0 ? (data.length * selectedColumns.length).toLocaleString() : 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Sel</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isExporting}>
            Batal
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}