"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Smartphone,
  Mail,
  Lock,
  Key,
  Trash2,
  Download,
  Upload,
  Save,
  RefreshCw,
  Users,
  Crown,
  Eye,
  EyeOff,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { NotificationSettings } from "@/components/notifications/notification-system";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state
  const [profile, setProfile] = useState({
    namaLengkap: session?.user?.name || "",
    email: session?.user?.email || "",
    telepon: "",
    alamat: "",
  });

  // Password state
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    companyName: "Inventory Inventory",
    companyEmail: "info@Inventory.com",
    companyPhone: "+62 812-3456-7890",
    companyAddress: "Jakarta, Indonesia",
    currency: "IDR",
    dateFormat: "dd/MM/yyyy",
    timeFormat: "24h",
    language: "id",
    timezone: "Asia/Jakarta",
  });

  // Backup settings state
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: "daily",
    backupRetention: "30",
    lastBackup: "2024-01-15 14:30:00",
    backupLocation: "local",
  });

  const handleProfileSave = () => {
    // TODO: Implement profile update API
    console.log("Saving profile:", profile);
  };

  const handlePasswordChange = () => {
    // TODO: Implement password change API
    if (password.newPassword !== password.confirmPassword) {
      alert("Password baru tidak cocok!");
      return;
    }
    console.log("Changing password");
  };

  const handleSystemSettingsSave = () => {
    // TODO: Implement system settings update API
    console.log("Saving system settings:", systemSettings);
  };

  const handleBackup = () => {
    // TODO: Implement backup functionality
    console.log("Creating backup...");
  };

  const handleRestore = () => {
    // TODO: Implement restore functionality
    console.log("Restoring backup...");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground">
          Kelola profil, preferensi, dan pengaturan sistem
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center space-x-2"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifikasi</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Keamanan</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center space-x-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Sistem</span>
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Backup</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Lanjutan</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Informasi Profil
              </CardTitle>
              <CardDescription>
                Perbarui informasi profil dan kontak Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="namaLengkap">Nama Lengkap</Label>
                  <Input
                    id="namaLengkap"
                    value={profile.namaLengkap}
                    onChange={(e) =>
                      setProfile({ ...profile, namaLengkap: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telepon">Telepon</Label>
                <Input
                  id="telepon"
                  value={profile.telepon}
                  onChange={(e) =>
                    setProfile({ ...profile, telepon: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Textarea
                  id="alamat"
                  value={profile.alamat}
                  onChange={(e) =>
                    setProfile({ ...profile, alamat: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-blue-600">
                  {session?.user?.role}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Role Pengguna
                </span>
              </div>
              <Button
                onClick={handleProfileSave}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Profil</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5" />
                Ubah Password
              </CardTitle>
              <CardDescription>
                Perbarui password akun Anda untuk keamanan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={password.currentPassword}
                  onChange={(e) =>
                    setPassword({
                      ...password,
                      currentPassword: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={password.newPassword}
                    onChange={(e) =>
                      setPassword({ ...password, newPassword: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={password.confirmPassword}
                    onChange={(e) =>
                      setPassword({
                        ...password,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button
                onClick={handlePasswordChange}
                className="flex items-center space-x-2"
              >
                <Key className="h-4 w-4" />
                <span>Ubah Password</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Keamanan Akun
              </CardTitle>
              <CardDescription>Pengaturan keamanan tambahan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan lapisan keamanan ekstra dengan 2FA
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Login Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Terima notifikasi saat ada login baru
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-muted-foreground">
                    Auto logout setelah 30 menit tidak aktif
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Management Settings */}
        <TabsContent value="roles" className="space-y-6">
          {/* Check if user has permission to access role management */}
          {session?.user?.role === "super_admin" ||
          session?.user?.role === "admin" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Crown className="mr-2 h-5 w-5" />
                    Manajemen Role & Permissions
                  </CardTitle>
                  <CardDescription>
                    Kelola role dan hak akses pengguna sistem
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Role Definitions</h3>
                    <div className="grid gap-4">
                      {/* Super Admin Role */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-purple-100 text-purple-800">
                              Super Admin
                            </Badge>
                            <span className="font-medium">
                              Administrator Sistem
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">
                              Full Access
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Akses penuh ke seluruh sistem termasuk manajemen user
                          dan konfigurasi sistem
                        </p>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">All Permissions</Badge>
                            <Badge variant="outline">User Management</Badge>
                            <Badge variant="outline">System Config</Badge>
                            <Badge variant="outline">Full Reports</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Admin Role */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              Admin
                            </Badge>
                            <span className="font-medium">Administrator</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-600">
                              High Access
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Akses lengkap ke master data, transaksi, laporan, dan
                          manajemen user
                        </p>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">Master Data CRUD</Badge>
                            <Badge variant="outline">All Transactions</Badge>
                            <Badge variant="outline">All Reports</Badge>
                            <Badge variant="outline">User Management</Badge>
                            <Badge variant="outline">System Settings</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Manager Role */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-100 text-green-800">
                              Manager
                            </Badge>
                            <span className="font-medium">Manajer</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">
                              Supervisor Access
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Akses supervisi untuk melaporkan dan menyetujui
                          transaksi penting
                        </p>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">View All Data</Badge>
                            <Badge variant="outline">Approve Retur</Badge>
                            <Badge variant="outline">View Dashboard</Badge>
                            <Badge variant="outline">Manage Master Data</Badge>
                            <Badge variant="outline">All Reports</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Staff Gudang Role */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-orange-100 text-orange-800">
                              Staff Gudang
                            </Badge>
                            <span className="font-medium">Staff Gudang</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-orange-600" />
                            <span className="text-sm text-orange-600">
                              Operational Access
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Akses operasional untuk transaksi barang masuk/keluar
                          dan manajemen stok
                        </p>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">Barang Masuk</Badge>
                            <Badge variant="outline">Delivery Order</Badge>
                            <Badge variant="outline">Surat Jalan</Badge>
                            <Badge variant="outline">View Stock</Badge>
                            <Badge variant="outline">View Master Data</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Sales Role */}
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-teal-100 text-teal-800">
                              Sales
                            </Badge>
                            <span className="font-medium">Sales</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-teal-600" />
                            <span className="text-sm text-teal-600">
                              Sales Access
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Akses untuk manajemen customer, membuat surat jalan,
                          dan retur penjualan
                        </p>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">Manage Customer</Badge>
                            <Badge variant="outline">Create Surat Jalan</Badge>
                            <Badge variant="outline">View Stock</Badge>
                            <Badge variant="outline">Manage Retur Jual</Badge>
                            <Badge variant="outline">View Master Data</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Current User Access
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span className="font-medium">Total Users</span>
                          </div>
                          <p className="text-2xl font-bold">24</p>
                          <p className="text-sm text-muted-foreground">
                            Active users in system
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <Crown className="h-5 w-5 text-purple-600" />
                            <span className="font-medium">
                              Role Distribution
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Super Admin:</span>
                              <span className="font-medium">2</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Admin:</span>
                              <span className="font-medium">3</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Manager:</span>
                              <span className="font-medium">5</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Staff Gudang:</span>
                              <span className="font-medium">8</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Sales:</span>
                              <span className="font-medium">6</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Permission Matrix</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Feature</th>
                            <th className="text-center p-2">Super Admin</th>
                            <th className="text-center p-2">Admin</th>
                            <th className="text-center p-2">Manager</th>
                            <th className="text-center p-2">Staff Gudang</th>
                            <th className="text-center p-2">Sales</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2 font-medium">Dashboard</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 font-medium">Master Data</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">👁️</td>
                            <td className="text-center p-2">👁️</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 font-medium">Transactions</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">👁️</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">🔄</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 font-medium">Reports</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">📊</td>
                            <td className="text-center p-2">📊</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 font-medium">User Management</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">❌</td>
                            <td className="text-center p-2">❌</td>
                            <td className="text-center p-2">❌</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium">System Settings</td>
                            <td className="text-center p-2">✅</td>
                            <td className="text-center p-2">🔧</td>
                            <td className="text-center p-2">👤</td>
                            <td className="text-center p-2">👤</td>
                            <td className="text-center p-2">👤</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="mt-2 text-xs text-muted-foreground">
                        ✅ Full Access | 👁️ View Only | 🔄 Limited | 📊 Reports
                        Only | 🔧 Partial | ❌ No Access
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Manage Users</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Refresh Permissions</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <EyeOff className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Access Restricted
                </h3>
                <p className="text-muted-foreground text-center">
                  Only Super Admin and Admin can access role management
                  settings.
                </p>
                <div className="mt-4">
                  <Badge variant="outline">
                    Your Role: {session?.user?.role}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Pengaturan Sistem
              </CardTitle>
              <CardDescription>
                Konfigurasi pengaturan umum sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nama Perusahaan</Label>
                  <Input
                    id="companyName"
                    value={systemSettings.companyName}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        companyName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email Perusahaan</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={systemSettings.companyEmail}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        companyEmail: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Mata Uang</Label>
                  <Select
                    value={systemSettings.currency}
                    onValueChange={(value) =>
                      setSystemSettings({ ...systemSettings, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR">
                        Indonesian Rupiah (IDR)
                      </SelectItem>
                      <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Bahasa</Label>
                  <Select
                    value={systemSettings.language}
                    onValueChange={(value) =>
                      setSystemSettings({ ...systemSettings, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">Bahasa Indonesia</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Alamat Perusahaan</Label>
                <Textarea
                  id="companyAddress"
                  value={systemSettings.companyAddress}
                  onChange={(e) =>
                    setSystemSettings({
                      ...systemSettings,
                      companyAddress: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
              <Button
                onClick={handleSystemSettingsSave}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Pengaturan</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="mr-2 h-5 w-5" />
                Backup & Restore
              </CardTitle>
              <CardDescription>Kelola backup data sistem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">Backup Settings</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto Backup</p>
                      <p className="text-sm text-muted-foreground">
                        Backup otomatis setiap hari
                      </p>
                    </div>
                    <Switch
                      checked={backupSettings.autoBackup}
                      onCheckedChange={(checked) =>
                        setBackupSettings({
                          ...backupSettings,
                          autoBackup: checked,
                        })
                      }
                    />
                  </div>
                  {backupSettings.autoBackup && (
                    <div className="space-y-2">
                      <Label>Frekuensi Backup</Label>
                      <Select
                        value={backupSettings.backupFrequency}
                        onValueChange={(value) =>
                          setBackupSettings({
                            ...backupSettings,
                            backupFrequency: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Harian</SelectItem>
                          <SelectItem value="weekly">Mingguan</SelectItem>
                          <SelectItem value="monthly">Bulanan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Retensi (hari)</Label>
                    <Input
                      type="number"
                      value={backupSettings.backupRetention}
                      onChange={(e) =>
                        setBackupSettings({
                          ...backupSettings,
                          backupRetention: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium">Backup Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Backup Terakhir:</span>
                      <span className="text-sm font-medium">
                        {backupSettings.lastBackup}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Lokasi Backup:</span>
                      <span className="text-sm font-medium">
                        {backupSettings.backupLocation}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleBackup}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Backup Sekarang</span>
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Restore Backup</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Restore Backup</DialogTitle>
                      <DialogDescription>
                        Pilih file backup untuk restore. Tindakan ini akan
                        mengganti data saat ini.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input type="file" accept=".zip,.sql" />
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Batal</Button>
                        <Button onClick={handleRestore} variant="destructive">
                          Restore
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="mr-2 h-5 w-5" />
                Pengaturan Lanjutan
              </CardTitle>
              <CardDescription>Pengaturan teknis dan debugging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Debug Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Aktifkan logging dan debug information
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">API Rate Limiting</p>
                  <p className="text-sm text-muted-foreground">
                    Batasi request API per menit
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cache Enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Gunakan caching untuk performance
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-4">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Version:</span> v1.0.0
                  </div>
                  <div>
                    <span className="font-medium">Environment:</span> Production
                  </div>
                  <div>
                    <span className="font-medium">Database:</span> MySQL 8.0
                  </div>
                  <div>
                    <span className="font-medium">Node.js:</span> v18.17.0
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-4">Danger Zone</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Clear Cache</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Database className="h-4 w-4" />
                    <span>Optimize Database</span>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="flex items-center space-x-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Reset All Settings</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset All Settings</DialogTitle>
                        <DialogDescription>
                          Ini akan mengembalikan semua pengaturan ke default.
                          Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Batal</Button>
                        <Button variant="destructive">Reset Settings</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
