"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn, getRoleText } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  FileText,
  RotateCcw,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Warehouse,
  ShoppingCart,
  Building,
  ArrowLeftRight,
  ChartLine,
} from "lucide-react";

type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const navigation: NavigationSection[] = [
  {
    title: "Menu Utama",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["super_admin", "admin", "manager", "staff_gudang", "sales"],
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        title: "Gudang",
        href: "/dashboard/master/gudang",
        icon: Warehouse,
        roles: ["super_admin", "admin", "manager"],
      },
      {
        title: "Barang",
        href: "/dashboard/master/barang",
        icon: Package,
        roles: ["super_admin", "admin", "manager", "staff_gudang"],
      },
      {
        title: "Customer",
        href: "/dashboard/master/customer",
        icon: Users,
        roles: ["super_admin", "admin", "manager", "sales"],
      },
      {
        title: "Supplier",
        href: "/dashboard/master/supplier",
        icon: Truck,
        roles: ["super_admin", "admin", "manager", "staff_gudang"],
      },
      {
        title: "Golongan",
        href: "/dashboard/master/golongan",
        icon: Building,
        roles: ["super_admin", "admin", "manager"],
      },
    ],
  },
  {
    title: "Transaksi",
    items: [
      {
        title: "Barang Masuk",
        href: "/dashboard/transaksi/barang-masuk",
        icon: ShoppingCart,
        roles: ["super_admin", "admin", "manager", "staff_gudang"],
      },
      {
        title: "Delivery Order",
        href: "/dashboard/transaksi/delivery-order",
        icon: Truck,
        roles: ["super_admin", "admin", "manager", "staff_gudang"],
      },
      {
        title: "Surat Jalan",
        href: "/dashboard/transaksi/surat-jalan",
        icon: FileText,
        roles: ["super_admin", "admin", "manager", "staff_gudang", "sales"],
      },
      {
        title: "Retur Beli",
        href: "/dashboard/transaksi/retur-beli",
        icon: RotateCcw,
        roles: ["super_admin", "admin", "manager", "staff_gudang"],
      },
      {
        title: "Retur Jual",
        href: "/dashboard/transaksi/retur-jual",
        icon: RotateCcw,
        roles: ["super_admin", "admin", "manager", "sales"],
      },
    ],
  },
  {
    title: "Laporan",
    items: [
      {
        title: "Stok",
        href: "/dashboard/laporan/stok",
        icon: BarChart3,
        roles: ["super_admin", "admin", "manager", "staff_gudang", "sales"],
      },
      {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: ChartLine,
        roles: ["super_admin", "admin", "manager"],
      },
      {
        title: "Mutasi",
        href: "/dashboard/laporan/mutasi",
        icon: ArrowLeftRight,
        roles: ["super_admin", "admin", "manager"],
      },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      {
        title: "User Management",
        href: "/dashboard/users",
        icon: SettingsIcon,
        roles: ["super_admin", "admin"],
      },
    ],
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  const filteredNavigation = useMemo(() => {
    return navigation
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(user.role)),
      }))
      .filter((section) => section.items.length > 0);
  }, [user.role]);

  const initials = useMemo(
    () =>
      user.name
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2),
    [user.name]
  );

  const handleSignOut = () => signOut({ callbackUrl: "/auth/login" });
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar
      collapsible="icon"
      className="bg-white border-r border-gray-200 text-gray-700 transition-all duration-300"
      {...props}
    >
      {/* HEADER */}
      <SidebarHeader className="border-b border-gray-200">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="hover:bg-gray-100 text-gray-900 font-semibold transition-colors"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
                <span>Stocky</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent>
        {filteredNavigation.map((section) => (
          <SidebarGroup key={section.title} className="mt-2">
            <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive(item.href)
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon
                          className={cn(
                            "h-5 w-5",
                            !isActive(item.href)
                              ? "text-gray-500"
                              : "text-blue-600",
                            "mr-3"
                          )}
                        />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 bg-gray-50/80 flex flex-col gap-2 p-3">
        {/* USER PROFILE */}
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-all">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white shrink-0">
            {initials}
          </div>
          <div className="flex flex-col text-sm leading-tight min-w-0">
            <span className="truncate font-medium text-gray-900">
              {user.name}
            </span>
            <span className="truncate text-xs text-gray-500">{user.email}</span>
            <span className="truncate text-xs text-blue-600">
              {getRoleText(user.role)}
            </span>
          </div>
        </div>

        {/* SEPARATOR */}
        <div className="border-t border-gray-200 my-1" />

        {/* LOGOUT BUTTON */}
        <SidebarMenu className="mt-auto">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
