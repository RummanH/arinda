export class ActivityLogController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  list = async (req, res, next) => {
    try {
      res.json(await this.auditService.list(req.query));
    } catch (error) {
      next(error);
    }
  };
}

