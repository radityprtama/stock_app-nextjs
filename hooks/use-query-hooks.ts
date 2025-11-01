import { useQuery, useQueryClient } from '@tanstack/react-query'
import { API_ENDPOINTS, TABLE_CONFIG } from '@/src/constants'
import type {
  GudangWithRelations,
  CustomerWithRelations,
  SupplierWithRelations,
  GolonganWithRelations,
  BarangWithGolongan,
  SupplierBarangWithDetails,
  StokBarangWithDetails,
  BarangMasukWithDetails,
  DeliveryOrderWithDetails,
  SuratJalanWithDetails,
  ReturBeliWithDetails,
  ReturJualWithDetails,
  DashboardStats,
  StockAlert,
  TransactionChart,
  PaginatedResponse,
  TableState
} from '@/src/types'

// Master Data Query Hooks
export const useGudangList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['gudang', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.GUDANG}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch gudang')
      return response.json() as Promise<PaginatedResponse<GudangWithRelations>>
    },
  })
}

export const useGudangById = (id: string) => {
  return useQuery({
    queryKey: ['gudang', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.GUDANG}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch gudang')
      return response.json() as Promise<GudangWithRelations>
    },
    enabled: !!id,
  })
}

export const useCustomerList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['customer', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.CUSTOMER}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch customer')
      return response.json() as Promise<PaginatedResponse<CustomerWithRelations>>
    },
  })
}

export const useCustomerById = (id: string) => {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.CUSTOMER}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch customer')
      return response.json() as Promise<CustomerWithRelations>
    },
    enabled: !!id,
  })
}

export const useSupplierList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['supplier', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.SUPPLIER}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch supplier')
      return response.json() as Promise<PaginatedResponse<SupplierWithRelations>>
    },
  })
}

export const useSupplierById = (id: string) => {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.SUPPLIER}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch supplier')
      return response.json() as Promise<SupplierWithRelations>
    },
    enabled: !!id,
  })
}

export const useGolonganList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['golongan', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.GOLONGAN}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch golongan')
      return response.json() as Promise<PaginatedResponse<GolonganWithRelations>>
    },
  })
}

export const useGolonganById = (id: string) => {
  return useQuery({
    queryKey: ['golongan', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.GOLONGAN}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch golongan')
      return response.json() as Promise<GolonganWithRelations>
    },
    enabled: !!id,
  })
}

export const useBarangList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['barang', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.BARANG}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch barang')
      return response.json() as Promise<PaginatedResponse<BarangWithGolongan>>
    },
  })
}

export const useBarangById = (id: string) => {
  return useQuery({
    queryKey: ['barang', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.BARANG}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch barang')
      return response.json() as Promise<BarangWithGolongan>
    },
    enabled: !!id,
  })
}

export const useSupplierBarangList = (barangId: string) => {
  return useQuery({
    queryKey: ['supplier-barang', barangId],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.BARANG}/${barangId}/suppliers`)
      if (!response.ok) throw new Error('Failed to fetch supplier barang')
      return response.json() as Promise<SupplierBarangWithDetails[]>
    },
    enabled: !!barangId,
  })
}

// Stock Query Hooks
export const useStockList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['stock', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.STOK}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch stock')
      return response.json() as Promise<PaginatedResponse<StokBarangWithDetails>>
    },
  })
}

export const useStockByGudang = (gudangId: string) => {
  return useQuery({
    queryKey: ['stock', 'gudang', gudangId],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.STOK}/gudang/${gudangId}`)
      if (!response.ok) throw new Error('Failed to fetch stock by gudang')
      return response.json() as Promise<StokBarangWithDetails[]>
    },
    enabled: !!gudangId,
  })
}

export const useStockByBarang = (barangId: string) => {
  return useQuery({
    queryKey: ['stock', 'barang', barangId],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.STOK}/barang/${barangId}`)
      if (!response.ok) throw new Error('Failed to fetch stock by barang')
      return response.json() as Promise<StokBarangWithDetails[]>
    },
    enabled: !!barangId,
  })
}

export const useStockCard = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['stock-card', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.STOK_KARTU}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch stock card')
      return response.json() as Promise<any[]>
    },
  })
}

// Transaction Query Hooks
export const useBarangMasukList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['barang-masuk', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.BARANG_MASUK}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch barang masuk')
      return response.json() as Promise<PaginatedResponse<BarangMasukWithDetails>>
    },
  })
}

export const useBarangMasukById = (id: string) => {
  return useQuery({
    queryKey: ['barang-masuk', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.BARANG_MASUK}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch barang masuk')
      return response.json() as Promise<BarangMasukWithDetails>
    },
    enabled: !!id,
  })
}

export const useDeliveryOrderList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['delivery-order', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.DELIVERY_ORDER}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch delivery order')
      return response.json() as Promise<PaginatedResponse<DeliveryOrderWithDetails>>
    },
  })
}

export const useDeliveryOrderById = (id: string) => {
  return useQuery({
    queryKey: ['delivery-order', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.DELIVERY_ORDER}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch delivery order')
      return response.json() as Promise<DeliveryOrderWithDetails>
    },
    enabled: !!id,
  })
}

export const useSuratJalanList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['surat-jalan', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.SURAT_JALAN}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch surat jalan')
      return response.json() as Promise<PaginatedResponse<SuratJalanWithDetails>>
    },
  })
}

export const useSuratJalanById = (id: string) => {
  return useQuery({
    queryKey: ['surat-jalan', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.SURAT_JALAN}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch surat jalan')
      return response.json() as Promise<SuratJalanWithDetails>
    },
    enabled: !!id,
  })
}

export const useReturBeliList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['retur-beli', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.RETUR_BELI}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch retur beli')
      return response.json() as Promise<PaginatedResponse<ReturBeliWithDetails>>
    },
  })
}

export const useReturBeliById = (id: string) => {
  return useQuery({
    queryKey: ['retur-beli', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.RETUR_BELI}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch retur beli')
      return response.json() as Promise<ReturBeliWithDetails>
    },
    enabled: !!id,
  })
}

export const useReturJualList = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['retur-jual', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`${API_ENDPOINTS.RETUR_JUAL}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch retur jual')
      return response.json() as Promise<PaginatedResponse<ReturJualWithDetails>>
    },
  })
}

export const useReturJualById = (id: string) => {
  return useQuery({
    queryKey: ['retur-jual', id],
    queryFn: async () => {
      const response = await fetch(`${API_ENDPOINTS.RETUR_JUAL}/${id}`)
      if (!response.ok) throw new Error('Failed to fetch retur jual')
      return response.json() as Promise<ReturJualWithDetails>
    },
    enabled: !!id,
  })
}

// Dashboard Query Hooks
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) throw new Error('Failed to fetch dashboard stats')
      return response.json() as Promise<DashboardStats>
    },
  })
}

export const useStockAlerts = () => {
  return useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stock-alerts')
      if (!response.ok) throw new Error('Failed to fetch stock alerts')
      return response.json() as Promise<StockAlert[]>
    },
  })
}

export const useTransactionChart = (period?: string) => {
  return useQuery({
    queryKey: ['transaction-chart', period],
    queryFn: async () => {
      const params = period ? new URLSearchParams({ period }) : ''
      const response = await fetch(`/api/dashboard/transaction-chart?${params}`)
      if (!response.ok) throw new Error('Failed to fetch transaction chart')
      return response.json() as Promise<TransactionChart[]>
    },
  })
}

// Query client hook for invalidation
export const useQueryClientInstance = () => {
  return useQueryClient()
}