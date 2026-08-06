import 'dotenv/config';
import { Plan, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL ?? 'admin@storebuilder.com';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@123456';
  const name = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';
  const rounds = Math.min(Number(process.env.BCRYPT_ROUNDS ?? 12), 14);

  const hashed = await bcrypt.hash(password, rounds);
  const adminEmails = Array.from(new Set([email, 'admin@bazar.com']));

  for (const adminEmail of adminEmails) {
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashed,
        role: Role.SUPER_ADMIN,
        name,
        plan: Plan.ENTERPRISE,
        isActive: true,
      },
      create: {
        email: adminEmail,
        password: hashed,
        role: Role.SUPER_ADMIN,
        name,
        plan: Plan.ENTERPRISE,
        isActive: true,
      },
    });

    console.log(`✅ Super admin ready: ${admin.email} / ${password}`);
  }

  // Seed a demo merchant
  const merchantEmail = 'merchant@demo.com';
  const merchantPass = 'Merchant@123';
  const merchantHash = await bcrypt.hash(merchantPass, rounds);

  const merchant = await prisma.user.upsert({
    where: { email: merchantEmail },
    update: {
      password: merchantHash,
      role: Role.MERCHANT,
      name: 'Demo Merchant',
      plan: Plan.FREE,
      isActive: true,
    },
    create: {
        email: merchantEmail,
        password: merchantHash,
        role: Role.MERCHANT,
        name: 'Demo Merchant',
        plan: Plan.FREE,
        isActive: true,
      },
  });

  console.log(`✅ Demo merchant ready: ${merchant.email} / ${merchantPass}`);

  const store = await prisma.store.upsert({
    where: { merchantId: merchant.id },
    update: {
      name: 'Demo Store',
      description: 'A sample store to get you started',
      theme: '#6366f1',
      isActive: true,
      isPublished: true,
    },
    create: {
        merchantId: merchant.id,
        name: 'Demo Store',
        slug: 'demo-store',
        description: 'A sample store to get you started',
        theme: '#6366f1',
        isActive: true,
        isPublished: true,
      },
  });

  const category = await prisma.category.upsert({
    where: {
      storeId_slug: {
        storeId: store.id,
        slug: 'general',
      },
    },
    update: {
      name: 'General',
    },
    create: {
      storeId: store.id,
      name: 'General',
      slug: 'general',
    },
  });

  const existingProducts = await prisma.product.count({
    where: { storeId: store.id },
  });

  if (existingProducts === 0) {
    await prisma.product.createMany({
      data: [
        {
          storeId: store.id,
          categoryId: category.id,
          name: 'Sample T-Shirt',
          description: 'A comfortable cotton t-shirt',
          price: 29.99,
          comparePrice: 39.99,
          stock: 100,
          images: [],
          isActive: true,
        },
        {
          storeId: store.id,
          categoryId: category.id,
          name: 'Classic Mug',
          description: 'A 12oz ceramic mug',
          price: 14.99,
          stock: 50,
          images: [],
          isActive: true,
        },
        {
          storeId: store.id,
          categoryId: category.id,
          name: 'Notebook',
          description: 'A5 lined notebook, 200 pages',
          price: 9.99,
          stock: 200,
          images: [],
          isActive: true,
        },
      ],
    });
  }

  console.log(`✅ Demo store ready: /store/${store.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
