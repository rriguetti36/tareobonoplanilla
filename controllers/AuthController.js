const UserService = require('../services/UserService');

class AuthController {
  static async login(req, res, next) {
    try {
      const { credential, email, password } = req.body;
      const user = await UserService.loginUser(credential || email, password);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
