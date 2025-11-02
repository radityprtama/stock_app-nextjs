'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  RotateCcw,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Building,
  ShoppingCart,
  Warehouse,
  ArrowLeftRight,
  ChartLine,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { getRoleText } from '@/lib/utils'

interface SidebarProps {
  user: {
    name: string
    email: string
    role: string
  }
}

const navigation = [
  {
    title: 'Menu Utama',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['super_admin', 'admin', 'manager', 'staff_gudang', 'sales'],
      },
    ],
  },
  {
    title: 'Master Data',
    items: [
      {
        title: 'Gudang',
        href: '/dashboard/master/gudang',
        icon: Warehouse,
        roles: ['super_admin', 'admin', 'manager'],
      },
      {
        title: 'Barang',
        href: '/dashboard/master/barang',
        icon: Package,
        roles: ['super_admin', 'admin', 'manager', 'staff_gudang'],
      },
      {
        title: 'Customer',
        href: '/dashboard/master/customer',
        icon: Users,
        roles: ['super_admin', 'admin', 'manager', 'sales'],
      },
      {
        title: 'Supplier',
        href: '/dashboard/master/supplier',
        icon: Truck,
        roles: ['super_admin', 'admin', 'manager', 'staff_gudang'],
      },
      {
        title: 'Golongan',
        href: '/dashboard/master/golongan',
        icon: Building,
        roles: ['super_admin', 'admin', 'manager'],
      },
    ],
  },
  {
    title: 'Transaksi',
    items: [
      {
        title: 'Barang Masuk',
        href: '/dashboard/transaksi/barang-masuk',
        icon: ShoppingCart,
        roles: ['super_admin', 'admin', 'manager', 'staff_gudang'],
      },
      {
        title: 'Delivery Order',
        href: '/dashboard/transaksi/delivery-order',
        icon: Truck,
        roles: ['super_admin', 'admin', 'manager', 'staff_gudang'],
      },
      {
        title: 'Surat Jalan',
        href: '/dashboard/transaksi/surat-jalan',
        icon: FileText,
        roles: ['super_admin', 'admin', 'manager', 'staff_gudang', 'sales'],
      },
      {
        title: 'Retur Beli',
        href: '/dashboard/transaksi/retur-beli',
        icon: RotateCcw,
        roles: ['super_admin', 'admin', 'manager', 'staff_gudang'],
      },
      {
        title: 'Retur Jual',
        href: '/dashboard/transaksi/retur-jual',
        icon: RotateCcw,
        roles: ['super_admin', 'admin', 'manager', 'sales'],
      },
    ],
  },
  {
    title: 'Laporan',
    items: [
      {
        title: 'Stok',
        href: '/dashboard/laporan/stok',
        icon: BarChart3,
        roles: ['super_admin', 'admin', 'manager', 'staff_gudang', 'sales'],
      },
      {
        title: 'Analytics',
        href: '/dashboard/analytics',
        icon: ChartLine,
        roles: ['super_admin', 'admin', 'manager']

      },
      {
        title: 'Mutasi',
        href: '/dashboard/laporan/mutasi',
        icon: ArrowLeftRight,
        roles: ['super_admin', 'admin', 'manager'],
      },
    ],
  },
  {
    title: 'Pengaturan',
    items: [
      {
        title: 'User Management',
        href: '/dashboard/users',
        icon: Settings,
        roles: ['super_admin', 'admin'],
      },
    ],
  },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' })
  }

  const filteredNavigation = navigation.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.roles.includes(user.role)
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <div
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 min-h-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Stocky</h2>
            <p className="text-sm text-gray-500">Inventory System</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className={cn("px-3 py-4", isCollapsed && "px-2")}>
            {filteredNavigation.map((section) => (
              <div key={section.title} className="mb-6 last:mb-0">
                {!isCollapsed && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                          isCollapsed && "justify-center"
                        )}
                      >
                        <item.icon
                          className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")}
                        />
                        {!isCollapsed && item.title}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className={cn("space-y-2", isCollapsed && "text-center")}>
          {!isCollapsed && (
            <>
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <p className="text-xs text-blue-600">
                  {getRoleText(user.role)}
                </p>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={cn(
              "group relative w-full justify-start rounded-lg font-medium text-foreground/90",
              "hover:bg-muted/60 hover:text-foreground transition-all duration-200 ease-in-out",
              "active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring/50",
              "flex items-center gap-2",
              isCollapsed && "justify-center px-2"
            )}
          >
            <LogOut
              className={cn(
                "h-4 w-4 transition-transform duration-200 group-hover:rotate-[-8deg] group-hover:scale-110",
                isCollapsed ? "" : "ml-0"
              )}
            />
            {!isCollapsed && (
              <span className="transition-opacity duration-200 group-hover:opacity-90">
                Logout
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
