import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatDate(date: Date | string, formatStr: string = 'dd MMMM yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatStr, { locale: id })
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd MMMM yyyy HH:mm')
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')

  // If starts with 0, replace with +62
  if (cleaned.startsWith('0')) {
    return '+62 ' + cleaned.substring(0, 3) + '-' + cleaned.substring(3, 7) + '-' + cleaned.substring(7)
  }

  // If starts with 62, just add +
  if (cleaned.startsWith('62')) {
    return '+62 ' + cleaned.substring(2, 5) + '-' + cleaned.substring(5, 9) + '-' + cleaned.substring(9)
  }

  return phone
}

export function generateDocNumber(prefix: string, date?: Date): string {
  const today = date || new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  // In real app, this should query database for the last sequence number
  const sequence = Math.floor(Math.random() * 9000) + 1000

  return `${prefix}/${year}/${month}/${sequence}`
}

export function calculateSubtotal(qty: number, price: number): number {
  return qty * price
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    posted: 'bg-green-100 text-green-800 border-green-200',
    in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    approved: 'bg-purple-100 text-purple-800 border-purple-200',
    completed: 'bg-teal-100 text-teal-800 border-teal-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ordered: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    received: 'bg-green-100 text-green-800 border-green-200',
  }

  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    draft: 'Draft',
    posted: 'Posted',
    in_transit: 'Dalam Perjalanan',
    delivered: 'Terkirim',
    cancelled: 'Dibatalkan',
    approved: 'Disetujui',
    completed: 'Selesai',
    pending: 'Pending',
    ordered: 'Dipesan',
    received: 'Diterima',
  }

  return texts[status] || status
}

export function getRoleText(role: string): string {
  const roles: Record<string, string> = {
    admin: 'Administrator',
    staff_gudang: 'Staff Gudang',
    sales: 'Sales',
    manager: 'Manager',
  }

  return roles[role] || role
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
