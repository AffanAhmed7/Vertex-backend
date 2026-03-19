import 'dotenv/config';
import { prisma } from './lib/prisma.js';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('Starting migration from JSON...');

    const dataPath = path.join(process.cwd(), 'prisma', 'products.json');
    if (!fs.existsSync(dataPath)) {
        console.error('products.json not found at:', dataPath);
        process.exit(1);
    }

    const allProducts = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as any[];
    
    console.log('Starting migration...');
    // ... rest of the logic ...

    // 1. Get unique categories from products
    const categories = [...new Set(allProducts.map((p: any) => p.category))];
    
    console.log(`Found ${categories.length} categories to sync.`);

    const categoryMap: Record<string, string> = {};

    for (const catName of categories as string[]) {
        const slug = catName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
        const category = await prisma.category.upsert({
            where: { slug },
            update: { name: catName },
            create: { name: catName, slug },
        });
        categoryMap[catName] = category.id;
        console.log(`Synced category: ${catName} (${category.id})`);
    }

    // 2. Sync products
    console.log(`Syncing ${allProducts.length} products...`);

    for (const p of allProducts as any[]) {
        const sku = `PROD-${String(p.id).padStart(4, '0')}`;

        await (prisma.product as any).upsert({
            where: { sku },
            update: {
                name: p.name,
                description: p.description,
                price: p.price,
                stock: 100,
                image: p.image,
                images: p.images,
                variants: p.variants,
                specs: p.specs,
                avgRating: p.rating,
                categoryId: categoryMap[p.category],
            },
            create: {
                sku,
                name: p.name,
                description: p.description,
                price: p.price,
                stock: 100,
                image: p.image,
                images: p.images,
                variants: p.variants,
                specs: p.specs,
                avgRating: p.rating,
                categoryId: categoryMap[p.category],
            },
        });
        console.log(`Synced product: ${p.name}`);
    }

    console.log('Migration completed successfully.');
}

main()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
