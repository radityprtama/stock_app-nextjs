import React from 'react'
import { Button } from '@/components/ui/button'
import { FileX, Package, ShoppingCart, Truck } from 'lucide-react'

interface EmptyStateProps {
  icon?: 'empty' | 'package' | 'cart' | 'truck'
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon = 'empty', title, description, action }: EmptyStateProps) {
  const icons = {
    empty: FileX,
    package: Package,
    cart: ShoppingCart,
    truck: Truck
  }

  const Icon = icons[icon]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}