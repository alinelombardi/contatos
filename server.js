const express = require('express');
const app = express();
require('dotenv').config();

// Configuração das rotas
app.use('/api/upload', require('./api/upload'));
app.use('/api/download', require('./api/download'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

module.exports = app;

