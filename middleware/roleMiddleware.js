module.exports = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta accion' });
  }
  return next();
};
