const express = require('express');
const axios = require('axios');
const xlsx = require('xlsx');
const fs = require('fs');
const streamifier = require('streamifier');
const { normalizePhoneNumber, extractPhoneNumbers } = require('./utils'); // Verifique este caminho
const { google } = require('googleapis');
require('dotenv').config();

const router = express.Router();

const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey
  },
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

router.post('/', async (req, res) => {
  try {
    const { defaultDDD, nomePlanilha, file } = req.body;

    if (!defaultDDD || !nomePlanilha || !file) {
      return res.status(400).json({ error: 'Parâmetros inválidos ou ausentes.' });
    }

    const fileUrl = file.uri;

    // Validação do link do Blip Media Store
    if (!fileUrl.includes('blipmediastore.blip.ai') || !fileUrl.includes('secure=true')) {
      return res.status(400).json({ error: 'Link inválido ou ausente de parâmetros necessários.' });
    }

    // Verificação da validade do link
    const urlParams = new URLSearchParams(fileUrl.split('?')[1]);
    const expiration = new Date(urlParams.get('se'));
    if (new Date() > expiration) {
      return res.status(400).json({ error: 'O link fornecido expirou.' });
    }

    // Baixar o arquivo usando Axios
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data);

    let modifiedData = [];

    // 1. Ler a planilha do buffer baixado
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

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
      name: `${nomePlanilha}_contatos.xlsx`,
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
      downloadUrl: downloadUrl,
    });
  } catch (error) {
    console.error('Erro ao processar os contatos:', error);
    res.status(500).json({ error: 'Erro ao processar os contatos.' });
  }
});

module.exports = router;
