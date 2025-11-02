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
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
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