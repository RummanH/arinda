export class ActivityLogController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  list = async (req, res, next) => {
    try {
      const limit = Number(req.query.limit || 100);
      const logs = await this.auditService.list(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100);
      res.json({ logs });
    } catch (error) {
      next(error);
    }
  };
}

