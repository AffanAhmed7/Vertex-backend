import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema.js';
import { createAuditLog } from '../lib/audit.js';
import { logger } from '../utils/logger.js';

export const CategoryController = {
    /**
     * Get all categories
     */
    async getCategories(_req: Request, res: Response) {
        try {
            const categories = await prisma.category.findMany({
                orderBy: { name: 'asc' },
            });
            return res.status(200).json({ success: true, data: categories });
        } catch (error) {
            logger.error({ err: error }, 'Get categories error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch categories' });
        }
    },

    /**
     * Get single category
     */
    async getCategory(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const category = await prisma.category.findUnique({ where: { id: String(id) } });

            if (!category) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Category not found' });
            }

            return res.status(200).json({ success: true, data: category });
        } catch (error) {
            logger.error({ err: error, categoryId: req.params?.id }, 'Get category error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to fetch category' });
        }
    },

    /**
     * Create category (Admin)
     */
    async createCategory(req: Request, res: Response) {
        try {
            const result = createCategorySchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const { name, slug } = result.data;

            // Check for existing slug
            const existing = await prisma.category.findUnique({ where: { slug } });
            if (existing) {
                return res.status(400).json({ success: false, error: 'Conflict', message: 'Category slug already exists' });
            }

            const category = await prisma.category.create({
                data: { name, slug },
            });

            // Audit Log
            await createAuditLog(req.user!.userId, 'CREATE', 'CATEGORY', category.id, { name: category.name });

            return res.status(201).json({ success: true, data: category, message: 'Category created successfully' });
        } catch (error) {
            logger.error({ err: error, userId: req.user?.userId, data: req.body }, 'Create category error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to create category' });
        }
    },

    /**
     * Update category (Admin)
     */
    async updateCategory(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = updateCategorySchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ success: false, error: 'Validation Error', details: result.error.format() });
            }

            const existingCategory = await prisma.category.findUnique({ where: { id: String(id) } });
            if (!existingCategory) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Category not found' });
            }

            if (result.data.slug && result.data.slug !== existingCategory.slug) {
                const slugExists = await prisma.category.findUnique({ where: { slug: result.data.slug } });
                if (slugExists) {
                    return res.status(400).json({ success: false, error: 'Conflict', message: 'Category slug already exists' });
                }
            }

            const updatedCategory = await prisma.category.update({
                where: { id: String(id) },
                data: result.data,
            });

            // Audit Log
            await createAuditLog(req.user!.userId, 'UPDATE', 'CATEGORY', updatedCategory.id, { name: updatedCategory.name });

            return res.status(200).json({ success: true, data: updatedCategory, message: 'Category updated successfully' });
        } catch (error) {
            logger.error({ err: error, categoryId: req.params?.id, userId: req.user?.userId }, 'Update category error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to update category' });
        }
    },

    /**
     * Delete category (Admin)
     */
    async deleteCategory(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const category = await prisma.category.findUnique({
                where: { id: String(id) },
                include: { _count: { select: { products: true } } },
            });

            if (!category) {
                return res.status(404).json({ success: false, error: 'Not Found', message: 'Category not found' });
            }

            if (category._count.products > 0) {
                return res.status(400).json({ success: false, error: 'Bad Request', message: 'Cannot delete category with associated products' });
            }

            const deletedCategory = await prisma.category.delete({ where: { id: String(id) } });

            // Audit Log
            await createAuditLog(req.user!.userId, 'DELETE', 'CATEGORY', id as string, { name: deletedCategory.name });

            return res.status(200).json({ success: true, message: 'Category deleted successfully' });
        } catch (error) {
            logger.error({ err: error, categoryId: req.params?.id, userId: req.user?.userId }, 'Delete category error');
            return res.status(500).json({ success: false, error: 'Internal Server Error', message: 'Failed to delete category' });
        }
    },
};
