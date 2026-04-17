/**
 * Seeds the Permission table with all platform-defined permission codes.
 * Run with: npx ts-node prisma/seed-permissions.ts
 *
 * Idempotent: uses upsert on `code`, safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Branches
  { code: "branches:read",   nameEn: "View Branches",       nameAr: "عرض الفروع",            module: "branches" },
  { code: "branches:create", nameEn: "Create Branches",     nameAr: "إنشاء الفروع",           module: "branches" },
  { code: "branches:update", nameEn: "Update Branches",     nameAr: "تعديل الفروع",           module: "branches" },
  { code: "branches:delete", nameEn: "Deactivate Branches", nameAr: "تعطيل الفروع",           module: "branches" },

  // Users
  { code: "users:read",   nameEn: "View Users",       nameAr: "عرض المستخدمين",   module: "users" },
  { code: "users:create", nameEn: "Create Users",     nameAr: "إنشاء المستخدمين", module: "users" },
  { code: "users:update", nameEn: "Update Users",     nameAr: "تعديل المستخدمين", module: "users" },
  { code: "users:delete", nameEn: "Deactivate Users", nameAr: "تعطيل المستخدمين", module: "users" },

  // Roles
  { code: "roles:read",   nameEn: "View Roles",   nameAr: "عرض الأدوار",   module: "roles" },
  { code: "roles:create", nameEn: "Create Roles", nameAr: "إنشاء الأدوار", module: "roles" },
  { code: "roles:update", nameEn: "Update Roles", nameAr: "تعديل الأدوار", module: "roles" },
  { code: "roles:delete", nameEn: "Delete Roles", nameAr: "حذف الأدوار",   module: "roles" },

  // Inventory
  { code: "inventory:read",   nameEn: "View Inventory",   nameAr: "عرض المخزون",   module: "inventory" },
  { code: "inventory:create", nameEn: "Add Inventory",    nameAr: "إضافة مخزون",   module: "inventory" },
  { code: "inventory:update", nameEn: "Update Inventory", nameAr: "تعديل المخزون", module: "inventory" },

  // Purchasing
  { code: "purchasing:read",   nameEn: "View Purchase Orders",   nameAr: "عرض أوامر الشراء",   module: "purchasing" },
  { code: "purchasing:create", nameEn: "Create Purchase Orders", nameAr: "إنشاء أوامر الشراء", module: "purchasing" },
  { code: "purchasing:update", nameEn: "Update Purchase Orders", nameAr: "تعديل أوامر الشراء", module: "purchasing" },

  // Sales
  { code: "sales:read",   nameEn: "View Sales",   nameAr: "عرض المبيعات",   module: "sales" },
  { code: "sales:create", nameEn: "Create Sales", nameAr: "إنشاء المبيعات", module: "sales" },
  { code: "sales:return", nameEn: "Sales Returns", nameAr: "مرتجعات المبيعات", module: "sales" },

  // Shifts
  { code: "shifts:read",   nameEn: "View Shifts",  nameAr: "عرض الوردیات",   module: "shifts" },
  { code: "shifts:manage", nameEn: "Manage Shifts", nameAr: "إدارة الوردیات", module: "shifts" },

  // Reports
  { code: "reports:read", nameEn: "View Reports", nameAr: "عرض التقارير", module: "reports" },

  // Settings
  { code: "settings:read",   nameEn: "View Settings",   nameAr: "عرض الإعدادات",   module: "settings" },
  { code: "settings:update", nameEn: "Update Settings", nameAr: "تعديل الإعدادات", module: "settings" },

  // Suppliers
  { code: "suppliers:read",   nameEn: "View Suppliers",   nameAr: "عرض الموردين",   module: "suppliers" },
  { code: "suppliers:create", nameEn: "Create Suppliers", nameAr: "إنشاء موردين",   module: "suppliers" },
  { code: "suppliers:update", nameEn: "Update Suppliers", nameAr: "تعديل الموردين", module: "suppliers" },
];

async function main() {
  console.log(`Seeding ${PERMISSIONS.length} permissions…`);

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { nameEn: perm.nameEn, nameAr: perm.nameAr, module: perm.module },
      create: perm,
    });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
