import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema.js';
import { createAuditLog } from '../lib/audit.js';
import { sendAdminNotification } from '../lib/socket.js';
import { addImageJob } from '../lib/queues.js';
import axios from 'axios';
import { logger } from '../utils/logger.js';

export const ProductController = {
    /**
     * Import products from an external API (Admin)
     */
    async importProducts(_req: Request, res: Response) {
        try {
            const externalUrl = 'https://fakestoreapi.com/products';
            const response = await axios.get(externalUrl);
            const externalProducts = response.data;

            let importedCount = 0;
            for (const item of externalProducts) {
                // Check if SKU already exists (using external ID as SKU for demo)
                const sku = `EXT-${item.id}`;
                const existing = await prisma.product.findUnique({ where: { sku } });

                if (!existing) {
                    const product = await prisma.product.create({
                        data: {
                            name: item.title,
                            description: item.description,
                            price: item.price,
                            sku,
                            stock: Math.floor(Math.random() * 100),
                            categoryId: (await prisma.category.findFirst())?.id || '', // Assign to first category
                            image: item.image,
                        } as any
                    });

                    // Add background job for image optimization
                    await addImageJob({
                        productId: product.id,
                        imageUrls: [item.image]
                    });

                    importedCount++;
                }
            }

            return res.status(200).json({
                success: true,
                message: `Successfully imported ${importedCount} products`,
                totalChecked: externalProducts.length
            });
        } catch (error) {
            logger.error({ err: error }, 'Import products error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to import products' });
        }
    },

    /**
     * Get all products with pagination and category filter
     */
    async getProducts(req: Request, res: Response): Promise<any> {
        try {
            const page = Number(req.query.page);
            const limit = Number(req.query.limit);
            const category = req.query.category as string | undefined;
            const search = req.query.search as string | undefined;
            const sortBy = req.query.sortBy as string | undefined;
            const minPrice = req.query.minPrice as string | undefined;
            const maxPrice = req.query.maxPrice as string | undefined;

            const where: any = {
                isActive: true,
            };

            if (category && category !== 'All') {
                where.category = {
                    name: category,
                };
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                ];
            }

            if (minPrice || maxPrice) {
                where.price = {};
                if (minPrice) where.price.gte = Number(minPrice);
                if (maxPrice) where.price.lte = Number(maxPrice);
            }

            let orderBy: any = { createdAt: 'desc' };
            if (sortBy) {
                switch (sortBy) {
                    case 'price-low':
                        orderBy = { price: 'asc' };
                        break;
                    case 'price-high':
                        orderBy = { price: 'desc' };
                        break;
                    case 'rating':
                        orderBy = { avgRating: 'desc' };
                        break;
                    case 'newest':
                        orderBy = { createdAt: 'desc' };
                        break;
                }
            }

            // If page is not provided, we return all products (old behavior for shop page)
            if (!page && !limit) {
                const products = await prisma.product.findMany({
                    where,
                    include: {
                        category: true,
                    },
                    orderBy,
                }) as any[];

                const formattedProducts = products.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    price: Number(p.price),
                    rating: p.avgRating,
                    category: p.category?.name || 'Uncategorized',
                    image: p.image,
                    images: p.images,
                    variants: p.variants,
                    specs: p.specs,
                    isAvailable: p.isActive && p.stock > 0,
                }));

                return res.status(200).json(formattedProducts);
            }

            const skip = (page - 1) * limit;
            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where,
                    include: { category: { select: { name: true, slug: true } } },
                    skip,
                    take: limit,
                    orderBy,
                }),
                prisma.product.count({ where }),
            ]);

            return res.status(200).json({
                success: true,
                data: products,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            logger.error({ err: error }, 'Get products error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch products' });
        }
    },

    async getProduct(req: Request, res: Response): Promise<any> {
        try {
            const { id } = req.params;
            const product = await prisma.product.findUnique({
                where: { id: String(id) },
                include: { category: true },
            }) as any;

            if (!product) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Product not found' });
            }

            const formattedProduct = {
                id: product.id,
                name: product.name,
                description: product.description,
                price: Number(product.price),
                rating: product.avgRating,
                category: product.category?.name || 'Uncategorized',
                image: product.image,
                images: product.images,
                variants: product.variants,
                specs: product.specs,
                isAvailable: product.isActive && product.stock > 0,
            };

            return res.status(200).json(formattedProduct);
        } catch (error) {
            logger.error({ err: error, productId: req.params?.id }, 'Get product error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch product' });
        }
    },

    /**
     * Create product (Admin)
     */
    async createProduct(req: Request, res: Response) {
        try {
            const result = createProductSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const { categoryId, sku, images, ...rest } = result.data;

            // Verify category exists
            const category = await prisma.category.findUnique({ where: { id: categoryId } });
            if (!category) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid category ID' });
            }

            // Check for existing SKU
            const existingSku = await prisma.product.findUnique({ where: { sku } });
            if (existingSku) {
                return res.status(400).json({ success: false, error: 'Conflict', message: 'Product with this SKU already exists' });
            }

            const product = await prisma.product.create({
                data: {
                    ...rest,
                    sku,
                    categoryId,
                } as any,
            });

            // Audit Log
            await createAuditLog((req as any).user.id, 'CREATE', 'PRODUCT', product.id, { name: product.name, sku: product.sku });

            // Trigger background image optimization if images provided
            if (images && images.length > 0) {
                await addImageJob({
                    productId: product.id,
                    imageUrls: images,
                });
            }

            return res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
        } catch (error) {
            logger.error({ err: error }, 'Create product error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to create product' });
        }
    },

    /**
     * Update product (Admin)
     */
    async updateProduct(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = updateProductSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const existingProduct = await prisma.product.findUnique({ where: { id: String(id) } });
            if (!existingProduct) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Product not found' });
            }

            if (result.data.sku && result.data.sku !== existingProduct.sku) {
                const skuExists = await prisma.product.findUnique({ where: { sku: result.data.sku } });
                if (skuExists) {
                    return res.status(400).json({ success: false, error: 'Conflict', message: 'Product SKU already exists' });
                }
            }

            if (result.data.categoryId) {
                const category = await prisma.category.findUnique({ where: { id: result.data.categoryId } });
                if (!category) {
                    return res.status(400).json({ success: false, error: 'Bad Request', message: 'Invalid category ID' });
                }
            }

            const updatedProduct = await prisma.product.update({
                where: { id: String(id) },
                data: result.data as any,
            });

            // Audit Log
            await createAuditLog((req as any).user.id, 'UPDATE', 'PRODUCT', updatedProduct.id, { name: updatedProduct.name, sku: updatedProduct.sku });

            // Emit low stock alert to admins if applicable
            if (updatedProduct.stock < 5) {
                sendAdminNotification('lowStockAlert', {
                    productId: updatedProduct.id,
                    productName: updatedProduct.name,
                    stock: updatedProduct.stock,
                });
            }

            return res.status(200).json({ success: true, data: updatedProduct, message: 'Product updated successfully' });
        } catch (error) {
            logger.error({ err: error, productId: req.params?.id }, 'Update product error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to update product' });
        }
    },

    /**
     * Delete product (Admin)
     */
    async deleteProduct(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const product = await prisma.product.findUnique({ where: { id: String(id) } });
            if (!product) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Product not found' });
            }

            const deletedProduct = await prisma.product.delete({ where: { id: String(id) } });

            // Audit Log
            await createAuditLog((req as any).user.id, 'DELETE', 'PRODUCT', id as string, { name: deletedProduct.name, sku: deletedProduct.sku });

            return res.status(200).json({ success: true, message: 'Product deleted successfully' });
        } catch (error) {
            logger.error({ err: error, productId: req.params?.id }, 'Delete product error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to delete product' });
        }
    },
};
