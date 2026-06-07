export class ProductController {
  constructor(inventoryService) {
    this.inventoryService = inventoryService;
  }

  create = async (req, res, next) => {
    try {
      const state = await this.inventoryService.saveProduct(req.body, req.currentUser);
      res.status(201).json(state);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const state = await this.inventoryService.saveProduct({ ...req.body, id: req.params.id }, req.currentUser);
      res.json(state);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.removeProduct(req.params.id, req.currentUser));
    } catch (error) {
      next(error);
    }
  };

  addStock = async (req, res, next) => {
    try {
      res.json(await this.inventoryService.addStock(req.params.id, req.body.addPieces, req.currentUser));
    } catch (error) {
      next(error);
    }
  };
}
