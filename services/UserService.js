const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const RoleService = require('./RoleService');

class UserService {
  static async getAllUsers(companyId) {
    return await UserModel.getAll(companyId);
  }

  static async getUserById(id, companyId) {
    const user = await UserModel.getById(id, companyId);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    return user;
  }

  static async createUser(data, companyId) {
    if (!data.name || !data.email || !data.password) {
      const error = new Error('Los campos name, email y password son obligatorios');
      error.status = 400;
      throw error;
    }
    const role = data.role ?? 'colaborador';
    await RoleService.requireActiveRole(companyId, role);
    const hashed = await bcrypt.hash(data.password, 10);
    const created = await UserModel.create({ companyId, name: data.name, email: data.email, password: hashed, estado: data.estado ?? 1, role });
    return created;
  }

  static async updateUser(id, data, companyId) {
    const existingUser = await UserModel.getById(id, companyId);
    if (!existingUser) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    if (!data.name || !data.email) {
      const error = new Error('Los campos name y email son obligatorios');
      error.status = 400;
      throw error;
    }
    const role = data.role ?? existingUser.role;
    await RoleService.requireActiveRole(companyId, role);
    return await UserModel.update(id, companyId, {
      name: data.name,
      email: data.email,
      estado: data.estado ?? existingUser.estado,
      role,
    });
  }

  static async changePassword(id, data, companyId) {
    const existingUser = await UserModel.getById(id, companyId);
    if (!existingUser) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    if (!data.password) {
      const error = new Error('La nueva contraseña es obligatoria');
      error.status = 400;
      throw error;
    }
    const hashed = await bcrypt.hash(data.password, 10);
    return await UserModel.updatePassword(id, companyId, hashed);
  }

  static async deleteUser(id, companyId) {
    const existingUser = await UserModel.getById(id, companyId);
    if (!existingUser) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    return await UserModel.delete(id, companyId);
  }

  static async loginUser(credential, password) {
    if (!credential || !password) {
      const error = new Error('Usuario y contraseña son requeridos');
      error.status = 400;
      throw error;
    }
    const user = await UserModel.getByCredential(credential.trim());
    if (!user) {
      const error = new Error('Correo o contraseña incorrectos');
      error.status = 401;
      throw error;
    }
    if (!user.estado) {
      const error = new Error('Acceso denegado: usuario inactivo');
      error.status = 403;
      throw error;
    }
    if (!user.companyEstado) {
      const error = new Error('Acceso denegado: empresa inactiva');
      error.status = 403;
      throw error;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      const error = new Error('Correo o contraseña incorrectos');
      error.status = 401;
      throw error;
    }
    const company = {
      id: user.companyId,
      code: user.companyCode,
      businessName: user.companyBusinessName,
      tradeName: user.companyTradeName,
    };
    const payload = { id: user.id, companyId: user.companyId, username: user.username, email: user.email, name: user.name, role: user.role || 'colaborador' };
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    return { id: user.id, companyId: user.companyId, company, username: user.username, name: user.name, email: user.email, role: user.role || 'colaborador', token };
  }
}

module.exports = UserService;
