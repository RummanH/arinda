export class StateController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  getState = async (_req, res, next) => {
    try {
      res.json(await this.inventoryService.getState());
    } catch (error) {
      next(error);
    }
  };
}
