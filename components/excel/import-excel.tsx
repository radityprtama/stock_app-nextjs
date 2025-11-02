'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  Loader2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { z } from 'zod'

interface ExcelImportProps {
  open: boolean
  onClose: () => void
  onImport: (data: any[]) => Promise<void>
  title: string
  description: string
  schema: z.ZodSchema
  sampleData?: any[]
  templateUrl?: string
}

interface ImportError {
  row: number
  field: string
  message: string
  value: any
}

interface ImportResult {
  success: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  errors: ImportError[]
  data: any[]
}

export default function ExcelImport({
  open,
  onClose,
  onImport,
  title,
  description,
  schema,
  sampleData,
  templateUrl,
}: ExcelImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ]

      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
        toast.error('Format file tidak diduk. Gunakan .xlsx, .xls, atau .csv')
        return
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file terlalu besar. Maksimal 10MB')
        return
      }

      setFile(selectedFile)
      processFile(selectedFile)
    }
  }

  const processFile = async (selectedFile: File) => {
    setIsProcessing(true)
    try {
      const data = await readExcelFile(selectedFile)

      if (data.length === 0) {
        toast.error('File kosong atau tidak ada data yang dapat dibaca')
        return
      }

      // Validate data against schema
      const validationResult = validateData(data, schema)

      setPreview(data.slice(0, 10)) // Show first 10 rows for preview
      setImportResult(validationResult)

      if (validationResult.validRows === 0) {
        toast.error('Tidak ada data yang valid. Periksa format dan isi file.')
      } else if (validationResult.invalidRows > 0) {
        toast.warning(`${validationResult.invalidRows} dari ${validationResult.totalRows} baris tidak valid`)
      } else {
        toast.success(`Semua ${validationResult.totalRows} baris data valid`)
      }
    } catch (error) {
      toast.error('Gagal memproses file. Pastikan format file benar.')
      console.error('File processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          if (jsonData.length < 2) {
            reject(new Error('File harus memiliki header dan minimal 1 baris data'))
            return
          }

          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1).filter(row => row && Object.keys(row).length > 0)

          // Convert rows to objects using headers
          const processedData = rows.map((row: any) => {
            const obj: any = {}
            headers.forEach((header, index) => {
              if (header) {
                obj[header] = row[index] || ''
              }
            })
            return obj
          })

          resolve(processedData)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Gagal membaca file'))
      reader.readAsBinaryString(file)
    })
  }

  const validateData = (data: any[], schema: z.ZodSchema): ImportResult => {
    const errors: ImportError[] = []
    const validData: any[] = []

    data.forEach((row, index) => {
      try {
        const validatedData = schema.parse(row)
        validData.push(validatedData)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.issues.forEach((err) => {
            errors.push({
              row: index + 2, // +2 because: +1 for array index, +1 for header row
              field: err.path.join('.'),
              message: err.message,
              value: 'received' in err ? err.received : undefined,
            })
          })
        }
      }
    })

    return {
      success: errors.length === 0,
      totalRows: data.length,
      validRows: validData.length,
      invalidRows: errors.length,
      errors,
      data: validData,
    }
  }

  const handleImport = async () => {
    if (!importResult || importResult.validRows === 0) {
      toast.error('Tidak ada data valid untuk diimport')
      return
    }

    setIsUploading(true)
    setProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      await onImport(importResult.data)

      clearInterval(progressInterval)
      setProgress(100)

      toast.success(`Berhasil mengimport ${importResult.validRows} data`)

      // Reset and close after a delay
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (error) {
      toast.error('Gagal mengimport data. Silakan coba lagi.')
      console.error('Import error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreview([])
    setImportResult(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  const downloadTemplate = () => {
    if (!sampleData || sampleData.length === 0) return

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_template.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Template berhasil diunduh')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Pilih File Excel</CardTitle>
              <CardDescription>
                Upload file Excel (.xlsx, .xls) atau CSV dengan data yang akan diimport
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const droppedFile = e.dataTransfer.files[0]
                    if (droppedFile) {
                      if (fileInputRef.current) {
                        const dataTransfer = new DataTransfer()
                        dataTransfer.items.add(droppedFile)
                        fileInputRef.current.files = dataTransfer.files
                        handleFileSelect({ target: { files: dataTransfer.files } } as any)
                      }
                    }
                  }}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Drag & drop file di sini atau klik untuk memilih
                    </p>
                    <p className="text-xs text-gray-500">
                      Maksimal ukuran file: 10MB. Format: .xlsx, .xls, .csv
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing || isUploading}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Pilih File
                      </>
                    )}
                  </Button>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <Badge variant="secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null)
                        setPreview([])
                        setImportResult(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {templateUrl && (
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={downloadTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  {importResult.success ? (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="mr-2 h-5 w-5 text-orange-600" />
                  )}
                  Hasil Validasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{importResult.validRows}</p>
                    <p className="text-sm text-gray-600">Data Valid</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{importResult.invalidRows}</p>
                    <p className="text-sm text-gray-600">Data Tidak Valid</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Ditemukan {importResult.errors.length} error. Perbaiki data dan coba lagi.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview Section */}
          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Eye className="mr-2 h-5 w-5" />
                  Preview Data (10 baris pertama)
                </CardTitle>
                <CardDescription>
                  Preview dari data yang akan diimport
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(preview[0]).map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 5).map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {String(value || '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Bar */}
          {isUploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Mengimport data...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Batal
          </Button>
          {importResult && importResult.validRows > 0 && (
            <Button
              onClick={handleImport}
              disabled={isUploading || importResult.validRows === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import {importResult.validRows} Data
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}