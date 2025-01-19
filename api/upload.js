const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { normalizePhoneNumber, extractPhoneNumbers } = require('./utils'); // Verifique este caminho

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), (req, res) => {
    try {
        const defaultDDD = req.body.defaultDDD;
        const filePath = req.file.path;
        const nomeplanilha = req.body.nomeplanilha;

        if (!fs.existsSync(filePath)) {
            return res.status(400).json({ error: 'Arquivo não encontrado. Certifique-se de fornecer o caminho correto.' });
        }

        let consolidatedData = [];
        const workbook = xlsx.readFile(filePath);
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

            consolidatedData.push(formattedRow);
        });

        const newWorkbook = xlsx.utils.book_new();
        const newSheet = xlsx.utils.json_to_sheet(consolidatedData);
        xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'ConsolidatedData');
        const outputFilePath = path.join(__dirname, `../uploads/${nomeplanilha}_contatos.xlsx`);
        xlsx.writeFile(newWorkbook, outputFilePath);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ downloadUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/download/${path.basename(outputFilePath)}` });

    } catch (error) {
        console.error('Erro ao processar os contatos:', error);
        res.status(500).json({ error: 'Erro ao processar os contatos.' });
    }
});

module.exports = router;
