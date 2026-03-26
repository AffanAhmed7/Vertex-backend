import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.product.count().then(c => console.log('count:', c)).finally(() => prisma.\());
