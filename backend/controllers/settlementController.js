export class SettlementController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  create = async (req, res, next) => {
    try {
      const state = await this.inventoryService.saveSettlement(req.body, req.currentUser);
      res.status(201).json(state);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.updateSettlement(req.params.id, req.body, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
