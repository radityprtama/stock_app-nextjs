import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_ENDPOINTS } from '@/src/constants'
import type {
  GudangForm,
  CustomerForm,
  SupplierForm,
  GolonganForm,
  BarangForm,
  BarangMasukForm,
  DeliveryOrderForm,
  SuratJalanForm,
  ReturBeliForm,
  ReturJualForm,
  ApiResponse
} from '@/src/types'

// Master Data Mutation Hooks
export const useCreateGudang = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: GudangForm) => {
      const response = await fetch(API_ENDPOINTS.GUDANG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create gudang')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gudang'] })
    },
  })
}

export const useUpdateGudang = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GudangForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.GUDANG}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update gudang')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['gudang'] })
      queryClient.invalidateQueries({ queryKey: ['gudang', id] })
    },
  })
}

export const useDeleteGudang = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.GUDANG}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete gudang')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gudang'] })
    },
  })
}

export const useCreateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CustomerForm) => {
      const response = await fetch(API_ENDPOINTS.CUSTOMER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create customer')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer'] })
    },
  })
}

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomerForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.CUSTOMER}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update customer')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customer'] })
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
    },
  })
}

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.CUSTOMER}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete customer')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer'] })
    },
  })
}

export const useCreateSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SupplierForm) => {
      const response = await fetch(API_ENDPOINTS.SUPPLIER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create supplier')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier'] })
    },
  })
}

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SupplierForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.SUPPLIER}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update supplier')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['supplier'] })
      queryClient.invalidateQueries({ queryKey: ['supplier', id] })
    },
  })
}

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.SUPPLIER}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete supplier')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier'] })
    },
  })
}

export const useCreateGolongan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: GolonganForm) => {
      const response = await fetch(API_ENDPOINTS.GOLONGAN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create golongan')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['golongan'] })
    },
  })
}

export const useUpdateGolongan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GolonganForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.GOLONGAN}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update golongan')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['golongan'] })
      queryClient.invalidateQueries({ queryKey: ['golongan', id] })
    },
  })
}

export const useDeleteGolongan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.GOLONGAN}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete golongan')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['golongan'] })
    },
  })
}

export const useCreateBarang = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BarangForm) => {
      const response = await fetch(API_ENDPOINTS.BARANG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create barang')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barang'] })
    },
  })
}

export const useUpdateBarang = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BarangForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.BARANG}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update barang')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['barang'] })
      queryClient.invalidateQueries({ queryKey: ['barang', id] })
    },
  })
}

export const useDeleteBarang = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.BARANG}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete barang')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barang'] })
    },
  })
}

// Transaction Mutation Hooks
export const useCreateBarangMasuk = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BarangMasukForm) => {
      const response = await fetch(API_ENDPOINTS.BARANG_MASUK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create barang masuk')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barang-masuk'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
  })
}

export const useUpdateBarangMasuk = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BarangMasukForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.BARANG_MASUK}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update barang masuk')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['barang-masuk'] })
      queryClient.invalidateQueries({ queryKey: ['barang-masuk', id] })
    },
  })
}

export const usePostBarangMasuk = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.BARANG_MASUK}/${id}/post`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to post barang masuk')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['barang-masuk'] })
      queryClient.invalidateQueries({ queryKey: ['barang-masuk', id] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
  })
}

export const useDeleteBarangMasuk = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.BARANG_MASUK}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete barang masuk')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barang-masuk'] })
    },
  })
}

export const useCreateDeliveryOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: DeliveryOrderForm) => {
      const response = await fetch(API_ENDPOINTS.DELIVERY_ORDER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create delivery order')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-order'] })
    },
  })
}

export const useUpdateDeliveryOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliveryOrderForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.DELIVERY_ORDER}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update delivery order')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-order'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-order', id] })
    },
  })
}

export const useUpdateDeliveryOrderStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`${API_ENDPOINTS.DELIVERY_ORDER}/${id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update delivery order status')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-order'] })
      queryClient.invalidateQueries({ queryKey: ['delivery-order', id] })
    },
  })
}

export const useDeleteDeliveryOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.DELIVERY_ORDER}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete delivery order')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-order'] })
    },
  })
}

export const useCreateSuratJalan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: SuratJalanForm) => {
      const response = await fetch(API_ENDPOINTS.SURAT_JALAN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create surat jalan')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surat-jalan'] })
    },
  })
}

export const useUpdateSuratJalan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SuratJalanForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.SURAT_JALAN}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update surat jalan')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['surat-jalan'] })
      queryClient.invalidateQueries({ queryKey: ['surat-jalan', id] })
    },
  })
}

export const useCheckSuratJalanStock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.SURAT_JALAN}/${id}/check-stock`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to check surat jalan stock')
      return response.json() as Promise<ApiResponse>
    },
  })
}

export const usePostSuratJalan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.SURAT_JALAN}/${id}/post`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to post surat jalan')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['surat-jalan'] })
      queryClient.invalidateQueries({ queryKey: ['surat-jalan', id] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
  })
}

export const useUpdateSuratJalanStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`${API_ENDPOINTS.SURAT_JALAN}/${id}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update surat jalan status')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['surat-jalan'] })
      queryClient.invalidateQueries({ queryKey: ['surat-jalan', id] })
    },
  })
}

export const useDeleteSuratJalan = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.SURAT_JALAN}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete surat jalan')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surat-jalan'] })
    },
  })
}

// Retur Mutation Hooks
export const useCreateReturBeli = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReturBeliForm) => {
      const response = await fetch(API_ENDPOINTS.RETUR_BELI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create retur beli')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retur-beli'] })
    },
  })
}

export const useUpdateReturBeli = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReturBeliForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.RETUR_BELI}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update retur beli')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['retur-beli'] })
      queryClient.invalidateQueries({ queryKey: ['retur-beli', id] })
    },
  })
}

export const useApproveReturBeli = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.RETUR_BELI}/${id}/approve`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to approve retur beli')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['retur-beli'] })
      queryClient.invalidateQueries({ queryKey: ['retur-beli', id] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
  })
}

export const useDeleteReturBeli = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.RETUR_BELI}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete retur beli')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retur-beli'] })
    },
  })
}

export const useCreateReturJual = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReturJualForm) => {
      const response = await fetch(API_ENDPOINTS.RETUR_JUAL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create retur jual')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retur-jual'] })
    },
  })
}

export const useUpdateReturJual = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReturJualForm> }) => {
      const response = await fetch(`${API_ENDPOINTS.RETUR_JUAL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update retur jual')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['retur-jual'] })
      queryClient.invalidateQueries({ queryKey: ['retur-jual', id] })
    },
  })
}

export const useApproveReturJual = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.RETUR_JUAL}/${id}/approve`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to approve retur jual')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['retur-jual'] })
      queryClient.invalidateQueries({ queryKey: ['retur-jual', id] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
  })
}

export const useDeleteReturJual = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_ENDPOINTS.RETUR_JUAL}/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete retur jual')
      return response.json() as Promise<ApiResponse>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retur-jual'] })
    },
  })
}