import { allProducts } from './temp-products.js';
import fs from 'fs';

console.log('Extracting products...');
fs.writeFileSync('./prisma/products.json', JSON.stringify(allProducts, null, 2));
console.log('Done.');
