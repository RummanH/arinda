export class BackupController {
  constructor(backupService, databaseManager) {
    this.backupService = backupService;
    this.databaseManager = databaseManager;
  }

  download = async (req, res, next) => {
    let backupFile = null;
    let client = null;

    try {
      backupFile = await this.backupService.createBackupFile();
      client = await this.databaseManager.getPool().connect();

      await new Promise((resolve, reject) => {
        res.download(backupFile.tempPath, backupFile.filename, (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      try {
        await this.backupService.recordDownload(client, req.currentUser, backupFile.filename);
      } catch (auditError) {
        console.error('Failed to record backup download audit entry');
        console.error(auditError);
      }
    } catch (error) {
      next(error);
    } finally {
      if (client) {
        client.release();
      }

      if (backupFile) {
        await this.backupService.removeBackupFile(backupFile.tempPath);
      }
    }
  };
}
