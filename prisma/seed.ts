import 'dotenv/config';
import prisma from '../src/lib/prisma.js';
import { allProducts } from './temp-products.js';

async function seed() {
    console.log('Seeding categories and products...');
    
    // 1. Extract unique categories
    const categoryNames = [...new Set(allProducts.map(p => p.category))];
    const categoryMap = new Map<string, string>();

    for (const name of categoryNames) {
        if (!name) continue;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const cat = await prisma.category.upsert({
            where: { slug },
            update: {},
            create: { name, slug }
        });
        categoryMap.set(name, cat.id);
    }
    
    console.log(`Ensured ${categoryNames.length} categories.`);

    // 2. Insert products
    let count = 0;
    for (const p of allProducts) {
        const categoryId = categoryMap.get(p.category) || (Array.from(categoryMap.values())[0]);
        if (!categoryId) continue;
        
        const sku = `SKU-${p.id || Math.floor(Math.random() * 1000000)}`;
        const stock = p.isAvailable ? Math.floor(Math.random() * 50) + 10 : 0;
        const isActive = p.isAvailable;

        await prisma.product.upsert({
            where: { sku: sku },
            update: {
                name: p.name,
                price: p.price,
                stock: stock,
                image: p.image,
                isActive: isActive,
            },
            create: {
                name: p.name,
                sku: sku,
                price: p.price,
                stock: stock,
                image: p.image,
                isActive: isActive,
                categoryId
            }
        });
        count++;
    }

    console.log(`Successfully seeded ${count} products.`);
}

seed()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
