export class IssueController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  create = async (req, res, next) => {
    try {
      const state = await this.inventoryService.saveIssue(req.body, req.currentUser);
      res.status(201).json(state);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.updateIssue(req.params.id, req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
