export class DsrController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  create = async (req, res, next) => {
    try {
      const state = await this.inventoryService.saveDsr(req.body, req.currentUser);
      res.status(201).json(state);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const state = await this.inventoryService.saveDsr({ ...req.body, id: req.params.id }, req.currentUser);
      res.json(state);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.removeDsr(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
