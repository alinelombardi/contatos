const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/:filename', (req, res) => {
    const filePath = path.join(__dirname, '../uploads', req.params.filename);
    res.download(filePath, (err) => {
        if (err) {
            console.error('Erro ao fazer download do arquivo:', err);
            res.status(500).json({ error: 'Erro ao fazer download do arquivo.' });
        }
    });
});

module.exports = router;
