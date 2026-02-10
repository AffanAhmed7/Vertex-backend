import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

console.log('🔍 Testing Database Connection...\n');

// Step 1: Check if DATABASE_URL is set
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.log('\nPlease set DATABASE_URL in your .env file');
    process.exit(1);
}

console.log('✅ DATABASE_URL is set');
console.log(`   URL: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);

// Step 2: Parse connection string
let url: URL;
let schema: string;
try {
    url = new URL(connectionString);
    schema = url.searchParams.get('schema') || 'ecommerce';
    console.log('✅ Connection string is valid');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port || '5432'}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    console.log(`   Schema: ${schema}\n`);
} catch (error) {
    console.error('❌ ERROR: Invalid DATABASE_URL format');
    console.error('   Error:', error);
    process.exit(1);
}

// Step 3: Test raw PostgreSQL connection
console.log('📡 Testing raw PostgreSQL connection...');
const pool = new Pool({
    connectionString,
    options: `-c search_path=${schema}`,
    connectionTimeoutMillis: 5000,
});

try {
    const client = await pool.connect();
    console.log('✅ Raw PostgreSQL connection successful');
    
    // Test schema
    const schemaResult = await client.query(
        `SELECT current_schema(), current_setting('search_path') as search_path`
    );
    console.log(`   Current schema: ${schemaResult.rows[0].current_schema}`);
    console.log(`   Search path: ${schemaResult.rows[0].search_path}`);
    
    // Check if schema exists
    const schemaExists = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schema]
    );
    
    if (schemaExists.rows.length === 0) {
        console.warn(`⚠️  WARNING: Schema "${schema}" does not exist in the database`);
        console.log(`   You may need to create it: CREATE SCHEMA IF NOT EXISTS ${schema};`);
    } else {
        console.log(`✅ Schema "${schema}" exists`);
    }
    
    // Check if tables exist
    const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
        ORDER BY table_name
    `, [schema]);
    
    if (tablesResult.rows.length === 0) {
        console.warn(`⚠️  WARNING: No tables found in schema "${schema}"`);
        console.log(`   You may need to run migrations: npx prisma migrate deploy`);
    } else {
        console.log(`✅ Found ${tablesResult.rows.length} table(s) in schema "${schema}":`);
        tablesResult.rows.forEach((row: any) => {
            console.log(`   - ${row.table_name}`);
        });
    }
    
    client.release();
    console.log('');
} catch (error: any) {
    console.error('❌ ERROR: Raw PostgreSQL connection failed');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
        console.error('\n💡 Possible issues:');
        console.error('   - PostgreSQL server is not running');
        console.error('   - Wrong host or port in DATABASE_URL');
    } else if (error.code === '28P01') {
        console.error('\n💡 Possible issues:');
        console.error('   - Invalid username or password');
    } else if (error.code === '3D000') {
        console.error('\n💡 Possible issues:');
        console.error('   - Database does not exist');
        console.error(`   - Create it: CREATE DATABASE ${url.pathname.slice(1)};`);
    }
    
    await pool.end();
    process.exit(1);
}

// Step 4: Test Prisma connection with adapter
console.log('🔌 Testing Prisma connection with adapter...');
const adapter = new PrismaPg(pool);

try {
    const prisma = new PrismaClient({
        adapter,
        log: ['error'],
    });
    
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Prisma connection successful');
    
    // Try to query a table (if it exists)
    try {
        const userCount = await prisma.user.count();
        console.log(`✅ Successfully queried users table (count: ${userCount})`);
    } catch (error: any) {
        if (error.code === 'P2021') {
            console.warn(`⚠️  WARNING: Tables not found in schema "${schema}"`);
            console.log('   Error:', error.message);
            console.log('   You may need to run: npx prisma migrate deploy');
        } else {
            console.warn(`⚠️  WARNING: Could not query users table`);
            console.log('   Error:', error.message);
        }
    }
    
    await prisma.$disconnect();
    console.log('');
} catch (error: any) {
    console.error('❌ ERROR: Prisma connection failed');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    if (error.code === 'P1001') {
        console.error('\n💡 Possible issues:');
        console.error('   - Cannot reach database server');
        console.error('   - Check if PostgreSQL is running');
    } else if (error.code === 'P1000') {
        console.error('\n💡 Possible issues:');
        console.error('   - Authentication failed');
        console.error('   - Check username and password in DATABASE_URL');
    }
    
    await pool.end();
    process.exit(1);
}

// Step 5: Cleanup
await pool.end();
console.log('✅ All connection tests passed!');
console.log('\n🎉 Database connection is working correctly!');

