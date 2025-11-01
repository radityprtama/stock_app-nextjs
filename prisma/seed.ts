import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create default user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      namaLengkap: 'Administrator',
      role: 'admin',
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // Create sample warehouses
  const gudang1 = await prisma.gudang.upsert({
    where: { kode: 'G001' },
    update: {},
    create: {
      kode: 'G001',
      nama: 'Gudang Utama',
      alamat: 'Jl. Warehouse No. 1, Jakarta',
      telepon: '021-1234567',
      pic: 'Budi Santoso',
    },
  })

  const gudang2 = await prisma.gudang.upsert({
    where: { kode: 'G002' },
    update: {},
    create: {
      kode: 'G002',
      nama: 'Gudang Secondary',
      alamat: 'Jl. Storage No. 2, Surabaya',
      telepon: '031-7654321',
      pic: 'Siti Nurhaliza',
    },
  })

  console.log('✅ Created warehouses:', [gudang1.nama, gudang2.nama])

  // Create sample categories
  const elektronik = await prisma.golongan.upsert({
    where: { kode: 'ELK' },
    update: {},
    create: {
      kode: 'ELK',
      nama: 'Elektronik',
      deskripsi: 'Barang-barang elektronik',
    },
  })

  const furniture = await prisma.golongan.upsert({
    where: { kode: 'FRN' },
    update: {},
    create: {
      kode: 'FRN',
      nama: 'Furniture',
      deskripsi: 'Barang-barang furniture',
    },
  })

  console.log('✅ Created categories:', [elektronik.nama, furniture.nama])

  // Create sample suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { kode: 'S001' },
    update: {},
    create: {
      kode: 'S001',
      nama: 'PT. Tech Supplier',
      alamat: 'Jl. Teknologi No. 100, Jakarta',
      telepon: '021-8888888',
      email: 'info@techsupplier.com',
      termPembayaran: 30,
    },
  })

  const supplier2 = await prisma.supplier.upsert({
    where: { kode: 'S002' },
    update: {},
    create: {
      kode: 'S002',
      nama: 'CV. Furniture Jaya',
      alamat: 'Jl. Kayu No. 50, Surabaya',
      telepon: '031-7777777',
      email: 'furniture@jaya.com',
      termPembayaran: 14,
    },
  })

  console.log('✅ Created suppliers:', [supplier1.nama, supplier2.nama])

  // Create sample customers
  const customer1 = await prisma.customer.upsert({
    where: { kode: 'C001' },
    update: {},
    create: {
      kode: 'C001',
      nama: 'PT. Mega Store',
      alamat: 'Jl. Raya No. 200, Bandung',
      telepon: '022-5555555',
      email: 'order@megastore.com',
      tipePelanggan: 'wholesale',
      limitKredit: 50000000,
    },
  })

  const customer2 = await prisma.customer.upsert({
    where: { kode: 'C002' },
    update: {},
    create: {
      kode: 'C002',
      nama: 'Toko Sejahtera',
      alamat: 'Jl. Merdeka No. 15, Yogyakarta',
      telepon: '0274-3333333',
      tipePelanggan: 'retail',
    },
  })

  console.log('✅ Created customers:', [customer1.nama, customer2.nama])

  // Create sample items
  const barang1 = await prisma.barang.upsert({
    where: { kode: 'B001' },
    update: {},
    create: {
      kode: 'B001',
      nama: 'LED TV 32 Inch',
      ukuran: '32 Inch',
      tipe: 'Smart TV',
      merk: 'Samsung',
      golonganId: elektronik.id,
      hargaBeli: 2500000,
      hargaJual: 2999000,
      satuan: 'unit',
      minStok: 5,
      maxStok: 50,
    },
  })

  const barang2 = await prisma.barang.upsert({
    where: { kode: 'B002' },
    update: {},
    create: {
      kode: 'B002',
      nama: 'Spring Bed Queen',
      ukuran: '160x200',
      tipe: 'Premium',
      merk: 'King Koil',
      golonganId: furniture.id,
      hargaBeli: 3500000,
      hargaJual: 4299000,
      satuan: 'unit',
      minStok: 3,
      maxStok: 20,
    },
  })

  const barang3 = await prisma.barang.upsert({
    where: { kode: 'B003' },
    update: {},
    create: {
      kode: 'B003',
      nama: 'Laptop Gaming',
      ukuran: '15.6 Inch',
      tipe: 'Gaming',
      merk: 'ASUS ROG',
      golonganId: elektronik.id,
      hargaBeli: 15000000,
      hargaJual: 17990000,
      satuan: 'unit',
      minStok: 2,
      maxStok: 10,
      isDropship: true, // This item can be dropshipped
    },
  })

  console.log('✅ Created items:', [barang1.nama, barang2.nama, barang3.nama])

  // Create supplier mapping for dropship item
  await prisma.supplierBarang.upsert({
    where: {
      barangId_supplierId: {
        barangId: barang3.id,
        supplierId: supplier1.id,
      },
    },
    update: {},
    create: {
      barangId: barang3.id,
      supplierId: supplier1.id,
      hargaBeli: 14500000,
      leadTime: 3,
      isPrimary: true,
    },
  })

  console.log('✅ Created supplier mapping for dropship items')

  // Create initial stock
  await prisma.stokBarang.upsert({
    where: {
      barangId_gudangId: {
        barangId: barang1.id,
        gudangId: gudang1.id,
      },
    },
    update: {},
    create: {
      barangId: barang1.id,
      gudangId: gudang1.id,
      qty: 25,
    },
  })

  await prisma.stokBarang.upsert({
    where: {
      barangId_gudangId: {
        barangId: barang2.id,
        gudangId: gudang1.id,
      },
    },
    update: {},
    create: {
      barangId: barang2.id,
      gudangId: gudang1.id,
      qty: 8,
    },
  })

  await prisma.stokBarang.upsert({
    where: {
      barangId_gudangId: {
        barangId: barang1.id,
        gudangId: gudang2.id,
      },
    },
    update: {},
    create: {
      barangId: barang1.id,
      gudangId: gudang2.id,
      qty: 15,
    },
  })

  console.log('✅ Created initial stock data')

  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })