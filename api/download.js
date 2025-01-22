const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
const path = require('path');
require('dotenv').config();

const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey
  },
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

router.get('/:fileId', async (req, res) => {
    const fileId = req.params.fileId;

    try {
        // Buscar metadados do arquivo
        const { data: fileMeta } = await drive.files.get({
            fileId,
            fields: 'name',
        });

        // Criar um stream para o arquivo
        const fileStream = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        // Configurar cabeçalhos e enviar o arquivo
        res.setHeader('Content-Disposition', `attachment; filename="${fileMeta.name}"`);
        fileStream.data.pipe(res);
    } catch (error) {
        // Tratamento de erro detalhado
        if (error.code === 404) {
            console.error(`Arquivo não encontrado: ${fileId}`);
            res.status(404).json({ error: 'Arquivo não encontrado no Google Drive.' });
        } else {
            console.error('Erro ao acessar o Google Drive:', error.message);
            res.status(500).json({ error: 'Erro interno ao buscar o arquivo.' });
        }
    }
});

module.exports = router;
