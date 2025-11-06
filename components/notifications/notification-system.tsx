"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle,
  Eye,
  Info,
  Package,
  Settings,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

// Types
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  category: "stock" | "transaction" | "system" | "dropship" | "customer";
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotificationPreferences {
  stock: boolean;
  transaction: boolean;
  system: boolean;
  dropship: boolean;
  customer: boolean;
  sound: boolean;
  desktop: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp" | "read">
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
}

// Context
const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};

// Provider
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    stock: true,
    transaction: true,
    system: true,
    dropship: true,
    customer: true,
    sound: true,
    desktop: true,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Request notification permission
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      preferences.desktop
    ) {
      Notification.requestPermission();
    }
  }, [preferences.desktop]);

  // Add notification
  const addNotification = (
    notification: Omit<Notification, "id" | "timestamp" | "read"> & {
      id?: string;
    }
  ) => {
    if (!preferences[notification.category]) return;

    const newNotification: Notification = {
      ...notification,
      id:
        notification.id ||
        Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // Show toast notification
    const iconMap = {
      info: <Info className="h-4 w-4" />,
      success: <CheckCircle className="h-4 w-4" />,
      warning: <AlertTriangle className="h-4 w-4" />,
      error: <AlertTriangle className="h-4 w-4" />,
    };

    toast(notification.title, {
      description: notification.message,
      icon: iconMap[notification.type],
    });

    // Play sound
    if (preferences.sound) {
      playNotificationSound(notification.type);
    }

    // Desktop notification
    if (
      preferences.desktop &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
        tag: notification.id,
      });
    }
  };

  // Mark as read
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Clear notification
  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Update preferences
  const updatePreferences = (newPrefs: Partial<NotificationPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "notification-preferences",
        JSON.stringify({ ...preferences, ...newPrefs })
      );
    }
  };

  // Load preferences from localStorage
  useEffect(() => {
    const loadPreferences = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("notification-preferences");
        if (saved) {
          try {
            setPreferences(JSON.parse(saved));
          } catch (error) {
            console.error("Failed to load notification preferences:", error);
          }
        }
      }
    };

    // Defer the effect to avoid cascading renders
    const timeoutId = setTimeout(loadPreferences, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Notification sound
const playNotificationSound = (type: string) => {
  if (typeof window === "undefined") return;

  const audio = new Audio();
  switch (type) {
    case "success":
      audio.src = "/sounds/success.mp3";
      break;
    case "warning":
    case "error":
      audio.src = "/sounds/alert.mp3";
      break;
    default:
      audio.src = "/sounds/notification.mp3";
  }

  audio.volume = 0.3;
  audio.play().catch(() => {
    // Ignore errors (user might have blocked audio)
  });
};

// Notification Bell Component
export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <NotificationDropdownContent onClose={() => setIsOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Notification Dropdown Content
function NotificationDropdownContent({ onClose }: { onClose: () => void }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      // Use router for navigation instead of direct window.location modification
      window.location.assign(notification.actionUrl);
    }
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "stock":
        return <Package className="h-4 w-4" />;
      case "transaction":
        return <ShoppingCart className="h-4 w-4" />;
      case "dropship":
        return <TrendingUp className="h-4 w-4" />;
      case "customer":
        return <Users className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600";
      case "warning":
        return "text-orange-600";
      case "error":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold">Notifikasi</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} baru</Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              clearAllNotifications();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Tidak ada notifikasi</p>
        </div>
      ) : (
        <div className="divide-y">
          {notifications.slice(0, 10).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="p-4 cursor-pointer"
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start space-x-3 w-full">
                <div className={`mt-1 ${getTypeColor(notification.type)}`}>
                  {getCategoryIcon(notification.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-medium truncate ${
                        notification.read ? "text-gray-700" : "text-gray-900"
                      }`}
                    >
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(notification.timestamp, {
                      addSuffix: true,
                      locale: id,
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(notification.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}

          {notifications.length > 10 && (
            <div className="p-2 text-center">
              <Button variant="ghost" size="sm">
                Lihat {notifications.length - 10} notifikasi lainnya
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Notification Settings Component
export function NotificationSettings() {
  const { preferences, updatePreferences } = useNotifications();

  return (
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
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifikasi Stok</p>
              <p className="text-sm text-gray-500">
                Peringatan stok rendah dan pergerakan stok
              </p>
            </div>
            <Switch
              checked={preferences.stock}
              onCheckedChange={(checked) =>
                updatePreferences({ stock: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifikasi Transaksi</p>
              <p className="text-sm text-gray-500">
                Update status transaksi dan aktivitas
              </p>
            </div>
            <Switch
              checked={preferences.transaction}
              onCheckedChange={(checked) =>
                updatePreferences({ transaction: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifikasi Dropship</p>
              <p className="text-sm text-gray-500">
                Update status dropship dan PO otomatis
              </p>
            </div>
            <Switch
              checked={preferences.dropship}
              onCheckedChange={(checked) =>
                updatePreferences({ dropship: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifikasi Customer</p>
              <p className="text-sm text-gray-500">
                Aktivitas customer dan retur
              </p>
            </div>
            <Switch
              checked={preferences.customer}
              onCheckedChange={(checked) =>
                updatePreferences({ customer: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifikasi Sistem</p>
              <p className="text-sm text-gray-500">
                Update sistem dan maintenance
              </p>
            </div>
            <Switch
              checked={preferences.system}
              onCheckedChange={(checked) =>
                updatePreferences({ system: checked })
              }
            />
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Suara Notifikasi</p>
                <p className="text-sm text-gray-500">
                  Mainkan suara saat notifikasi masuk
                </p>
              </div>
              <Switch
                checked={preferences.sound}
                onCheckedChange={(checked) =>
                  updatePreferences({ sound: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="font-medium">Notifikasi Desktop</p>
                <p className="text-sm text-gray-500">
                  Tampilkan notifikasi di desktop browser
                </p>
              </div>
              <Switch
                checked={preferences.desktop}
                onCheckedChange={(checked) =>
                  updatePreferences({ desktop: checked })
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for auto notifications
export function useAutoNotifications() {
  const { addNotification } = useNotifications();

  // Stock notifications
  const notifyLowStock = (
    productName: string,
    currentStock: number,
    minStock: number
  ) => {
    addNotification({
      type: "warning",
      title: "Stok Rendah",
      message: `${productName} - Stok tersisa: ${currentStock} (minimum: ${minStock})`,
      category: "stock",
      metadata: { productName, currentStock, minStock },
      actionUrl: "/dashboard/master/barang",
    });
  };

  const notifyStockUpdate = (
    productName: string,
    type: "in" | "out",
    quantity: number
  ) => {
    addNotification({
      type: "info",
      title: `Stok ${type === "in" ? "Masuk" : "Keluar"}`,
      message: `${productName}: ${quantity} unit`,
      category: "stock",
      metadata: { productName, type, quantity },
    });
  };

  // Transaction notifications
  const notifyTransactionStatus = (
    type: string,
    docNumber: string,
    status: string
  ) => {
    const statusMessages = {
      draft: "Dibuat",
      posted: "Diposting",
      in_transit: "Dalam pengiriman",
      delivered: "Selesai",
      cancelled: "Dibatalkan",
    };

    addNotification({
      type:
        status === "cancelled"
          ? "error"
          : status === "delivered"
            ? "success"
            : "info",
      title: `Update ${type}`,
      message: `${docNumber} - ${statusMessages[status as keyof typeof statusMessages] || status}`,
      category: "transaction",
      metadata: { type, docNumber, status },
    });
  };

  // Dropship notifications
  const notifyDropshipUpdate = (productName: string, status: string) => {
    const statusMessages = {
      pending: "Menunggu proses",
      ordered: "Sudah dipesan ke supplier",
      received: "Sudah diterima",
    };

    addNotification({
      type: status === "received" ? "success" : "info",
      title: "Update Dropship",
      message: `${productName}: ${statusMessages[status as keyof typeof statusMessages]}`,
      category: "dropship",
      metadata: { productName, status },
    });
  };

  // System notifications
  const notifySystemMaintenance = (message: string) => {
    addNotification({
      type: "warning",
      title: "Pemeliharaan Sistem",
      message,
      category: "system",
    });
  };

  return {
    notifyLowStock,
    notifyStockUpdate,
    notifyTransactionStatus,
    notifyDropshipUpdate,
    notifySystemMaintenance,
  };
}
