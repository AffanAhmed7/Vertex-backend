import 'dotenv/config';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const url = new URL(connectionString);
const schema = url.searchParams.get('schema') || 'ecommerce';

const pool = new Pool({
    connectionString,
    options: `-c search_path=${schema}`,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('--- Database Maintenance: Resetting Reviews and Ratings ---');
    
    try {
        const { count: reviewCount } = await prisma.review.deleteMany({});
        console.log(`Successfully deleted ${reviewCount} review(s).`);

        const { count: productCount } = await prisma.product.updateMany({
            data: {
                avgRating: 0,
                numReviews: 0,
            },
        });
        console.log(`Successfully reset ratings and review counts for ${productCount} product(s).`);
        console.log('--- Operation Complete ---');
    } catch (error) {
        console.error('Error during database reset:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main().catch(console.error);
