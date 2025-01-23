const express = require('express');
const app = express();
require('dotenv').config();
const bodyParser = require('body-parser');

// // Configuração das rotas
// app.use('/api/upload', require('./api/upload'));
// app.use('/api/download', require('./api/download'));

// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//     console.log(`Servidor rodando na porta ${port}`);
// });

// module.exports = app;

// Middleware para processar JSON e dados de formulários
app.use(express.json()); // Processa corpos de requisições no formato JSON
app.use(express.urlencoded({ extended: true })); // Processa dados de formulários codificados (form-urlencoded)

// Configuração das rotas
app.use('/api/upload', require('./api/upload'));
app.use('/api/download', require('./api/download'));

// Inicializa o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

module.exports = app;

