import { prisma } from './prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Creates an audit log entry for administrative actions
 * 
 * @param adminId - ID of the admin performing the action
 * @param action - Action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param entity - Entity affected (e.g., 'PRODUCT', 'CATEGORY', 'ORDER')
 * @param entityId - ID of the affected entity
 * @param metadata - Additional details about the action
 */
export async function createAuditLog(
    adminId: string,
    action: string,
    entity: string,
    entityId: string,
    metadata?: any
) {
    try {
        await prisma.auditLog.create({
            data: {
                adminId,
                action,
                entity,
                entityId,
                metadata: metadata || {},
            },
        });
    } catch (error) {
        // We don't want to fail the main transaction if logging fails, 
        // but we should log the error
        logger.error({ err: error, adminId, action, entity, entityId }, 'Failed to create audit log');
    }
}
