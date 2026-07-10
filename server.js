const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const coreRoutes = require('./routes/coreRoutes');
const collaboratorRoutes = require('./routes/collaboratorRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const operationalRoutes = require('./routes/operationalRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const personnelProcessRoutes = require('./routes/personnelProcessRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const bonusRoutes = require('./routes/bonusRoutes');

const app = express();
const allowedOrigin = process.env.CLIENT_ORIGIN || /http:\/\/localhost:\d+/;
app.use(cors({ origin: allowedOrigin, credentials: true }));
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3001;

app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/core', coreRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/operational', operationalRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/personnel-processes', personnelProcessRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/bonuses', bonusRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API Express + SQL Server Express funcionando' });
});

app.use((err, req, res, next) => {
  const isDuplicate = err.number === 2601 || err.number === 2627;
  const isFileTooLarge = err.code === 'LIMIT_FILE_SIZE';
  const status = isDuplicate ? 409 : (isFileTooLarge ? 400 : (Number.isInteger(err.status) ? err.status : 500));

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: isDuplicate ? 'Ya existe un registro con los mismos datos' : (isFileTooLarge ? 'La foto no puede superar los 5 MB' : (status >= 500 ? 'Error interno del servidor' : err.message)),
  });
});

function startServer(port = DEFAULT_PORT) {
  const server = app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Puerto ${port} en uso, probando el siguiente puerto...`);
      startServer(port + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

startServer();
