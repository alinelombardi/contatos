const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path'); // Certifique-se de que esta linha está presente
const { normalizePhoneNumber, extractPhoneNumbers } = require('./utils'); // Verifique este caminho
const { google } = require('googleapis');
const streamifier = require('streamifier');
require('dotenv').config();

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const auth = new google.auth.GoogleAuth({
    credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: process.env.GOOGLE_AUTH_URI,
        token_uri: process.env.GOOGLE_TOKEN_URI,
        client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

router.post('/', upload.single('file'), async (req, res) => {
    try {
        const defaultDDD = req.body.defaultDDD; // Valor recebido no corpo da requisição
        const name = req.body.nomePlanilha; // Valor recebido no corpo da requisição
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
        }

        let modifiedData = [];

        // 1. Ler a planilha do buffer recebido
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

        // 2. Alterar a planilha conforme necessário
        const sheetName = workbook.SheetNames[0];
        const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);


        sheet.forEach((row) => {
            let fullName = [row['Nome'], row['Segundo nome'], row['Sobrenome']]
                .filter(Boolean)
                .join(' ');

            let phones = Object.values(row)
                .filter((value) => typeof value === 'string' && value.match(/\d+/))
                .flatMap((cellContent) => extractPhoneNumbers(cellContent))
                .map((phone) => normalizePhoneNumber(phone, defaultDDD))
                .filter((item) => item && item.number);

            let formattedRow = {
                Nome: fullName,
                ...phones.reduce((acc, phone, index) => {
                    acc[`Telefone ${index + 1}`] = phone.number;
                    acc[`Observação ${index + 1}`] = phone.note;
                    return acc;
                }, {})
            };

            modifiedData.push(formattedRow);
        });

        // Criar um novo workbook com os dados modificados
        const newWorkbook = xlsx.utils.book_new();
        const newSheet = xlsx.utils.json_to_sheet(modifiedData);
        xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'ModifiedData');

        // 3. Gerar o buffer da nova planilha
        const newFileBuffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });

        // 4. Enviar a planilha alterada para o Google Drive
        const fileMetadata = {
            name: `${name}_contatos.xlsx`,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // ID da pasta no Google Drive, configurado como variável de ambiente
        };

        const media = {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            body: streamifier.createReadStream(newFileBuffer),
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media,
            fields: 'id, webViewLink',
        });

        // ID do arquivo gerado
        const fileId = driveResponse.data.id;

        // Link para download direto
        const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

        console.log('Resposta do Google Drive:', driveResponse.data);
        console.log('Buffer do arquivo gerado:', newFileBuffer.length);

        // Concedendo permissões públicas ao arquivo
        await drive.permissions.create({
            fileId: driveResponse.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // 5. Retornar o link de download
        res.json({
            message: 'Planilha enviada e processada com sucesso!',
            downloadUrl: downloadUrl, // Enviando link de download
            // downloadUrl: driveResponse.data.webViewLink,
        });

    } catch (error) {
        console.error('Erro ao processar os contatos:', error);
        res.status(500).json({ error: 'Erro ao processar os contatos.' });
    }
});

module.exports = router;
