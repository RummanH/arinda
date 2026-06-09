import { createId } from '../lib/ids.js';
import { buildPageResult, parsePagination } from '../lib/pagination.js';
import { countActivityLogs, insertActivityLog, listActivityLogsPage } from '../repositories/activityLogRepository.js';

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

  async list(query = {}) {
    const { page, pageSize, limit, offset } = parsePagination(query);
    const search = String(query.search || '').trim();

    const client = await this.databaseManager.getPool().connect();
    try {
      const [items, total] = await Promise.all([
        listActivityLogsPage(client, { search, limit, offset }),
        countActivityLogs(client, { search }),
      ]);

      return buildPageResult({ items, total, page, pageSize });
    } finally {
      client.release();
    }
  }
}

