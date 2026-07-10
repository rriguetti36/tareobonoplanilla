const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const directory = path.join(process.cwd(), 'uploads', 'collaborators', String(req.user.companyId));
    fs.mkdirSync(directory, { recursive: true });
    callback(null, directory);
  },
  filename: (req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${allowedTypes.get(file.mimetype)}`);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error('La foto debe ser JPG, PNG o WebP');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});
