import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
}

function buildPgDumpEnv(connectionString) {
  const url = new URL(connectionString);
  const env = { ...process.env };

  env.PGHOST = url.hostname;
  if (url.port) {
    env.PGPORT = url.port;
  }
  env.PGDATABASE = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (url.username) {
    env.PGUSER = decodeURIComponent(url.username);
  }
  if (url.password) {
    env.PGPASSWORD = decodeURIComponent(url.password);
  }

  const sslmode = url.searchParams.get('sslmode');
  if (sslmode === 'no-verify') {
    env.PGSSLMODE = 'require';
  } else if (sslmode) {
    env.PGSSLMODE = sslmode;
  }

  return env;
}

function runPgDump(connectionString, outputPath) {
  return new Promise((resolve, reject) => {
    const dump = spawn(
      'pg_dump',
      [
        '--format=plain',
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        '--file',
        outputPath,
      ],
      {
        env: buildPgDumpEnv(connectionString),
        windowsHide: true,
      },
    );

    let stderr = '';
    dump.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    dump.on('error', () => {
      reject(new Error('pg_dump is not available on this server. Install PostgreSQL client tools to enable database backups.'));
    });

    dump.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `pg_dump exited with code ${code}.`));
    });
  });
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

export class BackupService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async createBackupFile() {
    const sqlFilename = `arinda-database-backup-${formatTimestamp()}.sql`;
    const sqlTempPath = path.join(os.tmpdir(), `${randomUUID()}.sql`);

    try {
      await runPgDump(this.databaseManager.getActiveDatabaseUrl(), sqlTempPath);
      return { filename: sqlFilename, tempPath: sqlTempPath };
    } catch (error) {
      const unavailable = String(error?.message || '').toLowerCase().includes('pg_dump is not available');
      if (!unavailable) {
        throw error;
      }

      const jsonFilename = `arinda-database-backup-${formatTimestamp()}.json`;
      const jsonTempPath = path.join(os.tmpdir(), `${randomUUID()}.json`);
      await this.createJsonBackup(jsonTempPath);
      return { filename: jsonFilename, tempPath: jsonTempPath };
    }
  }

  async removeBackupFile(tempPath) {
    await fs.unlink(tempPath).catch(() => {});
  }

  async createJsonBackup(tempPath) {
    const pool = this.databaseManager.getPool();
    const { rows: tableRows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const tables = {};
    for (const tableRow of tableRows) {
      const tableName = tableRow.table_name;
      const { rows } = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)}`);
      tables[tableName] = rows;
    }

    const payload = {
      format: 'json',
      generatedAt: new Date().toISOString(),
      database: decodeURIComponent(new URL(this.databaseManager.getActiveDatabaseUrl()).pathname.replace(/^\//, '')),
      tables,
    };

    await fs.writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  async recordDownload(client, user, filename) {
    if (!this.auditService) {
      return;
    }

    await this.auditService.record(client, {
      userId: user.id,
      actionType: 'download',
      entityType: 'database_backup',
      entityId: null,
      description: `${user.name} downloaded database backup`,
      metadata: { filename },
    });
  }
}
