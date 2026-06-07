import { createId } from '../lib/ids.js';
import { insertActivityLog, listActivityLogs } from '../repositories/activityLogRepository.js';

export class AuditService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  buildDescription(actionType, entityType, entityId, actorName, extra = '') {
    const base = `${actorName} ${actionType} ${entityType}`;
    return entityId ? `${base} #${entityId}${extra ? ` - ${extra}` : ''}` : `${base}${extra ? ` - ${extra}` : ''}`;
  }

  async record(client, entry) {
    return insertActivityLog(client, {
      id: createId('log'),
      userId: entry.userId,
      actionType: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      description: entry.description,
      metadata: entry.metadata || {},
    });
  }

  async list(limit = 100) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return await listActivityLogs(client, limit);
    } finally {
      client.release();
    }
  }
}

