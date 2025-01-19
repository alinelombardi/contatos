const express = require('express');
const path = require('path');

const app = express();

app.use('/api/upload', require('./api/upload'));
app.use('/api/download', require('./api/download'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

module.exports = app;
