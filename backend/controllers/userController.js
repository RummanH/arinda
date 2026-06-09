export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ users: await this.userService.listUsers(req.currentUser) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const users = await this.userService.createUser(req.body, req.currentUser);
      res.status(201).json({ users });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const users = await this.userService.updateUser(req.params.id, req.body, req.currentUser);
      res.json({ users });
    } catch (error) {
      next(error);
    }
  };
}
