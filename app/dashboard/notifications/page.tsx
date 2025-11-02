'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bell,
  BellRing,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Trash2,
  Eye,
  Clock,
  TrendingUp,
  Users,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { useNotifications, NotificationSettings } from '@/components/notifications/notification-system'
import { format, formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotifications()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showSettings, setShowSettings] = useState(false)

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || notification.category === selectedCategory
    const matchesType = selectedType === 'all' || notification.type === selectedType

    return matchesSearch && matchesCategory && matchesType
  })

  // Group notifications by category
  const notificationsByCategory = {
    stock: filteredNotifications.filter(n => n.category === 'stock'),
    transaction: filteredNotifications.filter(n => n.category === 'transaction'),
    dropship: filteredNotifications.filter(n => n.category === 'dropship'),
    customer: filteredNotifications.filter(n => n.category === 'customer'),
    system: filteredNotifications.filter(n => n.category === 'system'),
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'stock': return <Package className="h-4 w-4" />
      case 'transaction': return <ShoppingCart className="h-4 w-4" />
      case 'dropship': return <TrendingUp className="h-4 w-4" />
      case 'customer': return <Users className="h-4 w-4" />
      case 'system': return <Settings className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stock': return 'text-blue-600 bg-blue-50'
      case 'transaction': return 'text-green-600 bg-green-50'
      case 'dropship': return 'text-purple-600 bg-purple-50'
      case 'customer': return 'text-orange-600 bg-orange-50'
      case 'system': return 'text-gray-600 bg-gray-50'
      default: return 'text-blue-600 bg-blue-50'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifikasi</h1>
          <p className="text-muted-foreground">
            Kelola notifikasi dan update sistem Anda
            {unreadCount > 0 && (
              <Badge className="ml-2" variant="secondary">
                {unreadCount} belum dibaca
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
              className="flex items-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>Tandai semua dibaca</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Pengaturan</span>
          </Button>
          <Button
            variant="outline"
            onClick={clearAllNotifications}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Hapus semua</span>
          </Button>
        </div>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Pengaturan Notifikasi
            </CardTitle>
            <CardDescription>
              Atur notifikasi yang ingin Anda terima
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari notifikasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="stock">Stok</SelectItem>
                <SelectItem value="transaction">Transaksi</SelectItem>
                <SelectItem value="dropship">Dropship</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="system">Sistem</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Sukses</SelectItem>
                <SelectItem value="warning">Peringatan</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Semua ({filteredNotifications.length})</span>
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center space-x-2">
            <BellRing className="h-4 w-4" />
            <span>Belum Dibaca ({filteredNotifications.filter(n => !n.read).length})</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Stok ({notificationsByCategory.stock.length})</span>
          </TabsTrigger>
          <TabsTrigger value="transaction" className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Transaksi ({notificationsByCategory.transaction.length})</span>
          </TabsTrigger>
          <TabsTrigger value="dropship" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Dropship ({notificationsByCategory.dropship.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <NotificationList
            notifications={filteredNotifications}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={markAsRead}
            onClearNotification={clearNotification}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          <NotificationList
            notifications={filteredNotifications.filter(n => !n.read)}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={markAsRead}
            onClearNotification={clearNotification}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <NotificationList
            notifications={notificationsByCategory.stock}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={markAsRead}
            onClearNotification={clearNotification}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>

        <TabsContent value="transaction" className="space-y-4">
          <NotificationList
            notifications={notificationsByCategory.transaction}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={markAsRead}
            onClearNotification={clearNotification}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>

        <TabsContent value="dropship" className="space-y-4">
          <NotificationList
            notifications={notificationsByCategory.dropship}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={markAsRead}
            onClearNotification={clearNotification}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Notification List Component
function NotificationList({
  notifications,
  onNotificationClick,
  onMarkAsRead,
  onClearNotification,
  getCategoryIcon,
  getCategoryColor,
  getTypeIcon,
}: {
  notifications: any[]
  onNotificationClick: (notification: any) => void
  onMarkAsRead: (id: string) => void
  onClearNotification: (id: string) => void
  getCategoryIcon: (category: string) => React.ReactNode
  getCategoryColor: (category: string) => string
  getTypeIcon: (type: string) => React.ReactNode
}) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tidak ada notifikasi</h3>
          <p className="text-muted-foreground text-center">
            Tidak ada notifikasi yang sesuai dengan filter yang dipilih.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
          }`}
          onClick={() => onNotificationClick(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className={`p-2 rounded-lg ${getCategoryColor(notification.category)}`}>
                  {getCategoryIcon(notification.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold truncate ${
                      notification.read ? 'text-gray-700' : 'text-gray-900'
                    }`}>
                      {notification.title}
                    </h3>
                    <div className="flex items-center space-x-2 ml-2">
                      {getTypeIcon(notification.type)}
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  </div>
                  <p className={`text-sm mb-2 ${
                    notification.read ? 'text-gray-600' : 'text-gray-800'
                  }`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: id })}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {notification.category}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 ml-4">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMarkAsRead(notification.id)
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClearNotification(notification.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}