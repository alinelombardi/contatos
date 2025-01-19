const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

function normalizePhoneNumber(phones, defaultDDD) {
  if (!phones) return null;

  let phone = phones.replace(/.*?:\s*/gi, '');
  let cleaned = phone.replace(/[\(\)\-\s]/g, '');
  cleaned = cleaned.replace(/^\++/, '+');

  if (cleaned.startsWith('*')) {
      return { number: phone, note: 'Número de operadora' };
  }

  if (cleaned.startsWith('0800')) {
      return { number: cleaned, note: 'Telefone 0800' };
  }

  if (cleaned.startsWith('(0)')) {
      cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith('+')) {
      if (cleaned.startsWith('+55')) {
          cleaned = cleaned.slice(3);
      } else if (cleaned.startsWith('+19')) {
          let qtdNum = cleaned.length;
          if (qtdNum === 11) {
              cleaned = cleaned.slice(1);
          }
      } else {
          return { number: cleaned, note: 'Internacional' };
      }
  } else if (cleaned.startsWith('00')) {
      if (cleaned.startsWith('0055')) {
          cleaned = cleaned.slice(4);
      } else {
          return { number: cleaned, note: 'Internacional' };
      }
  }

  if (cleaned.length >= 12) {
      cleaned = cleaned.slice(cleaned.length - 11);
  }

  if (cleaned.length === 8 || cleaned.length === 9) {
      cleaned = `${defaultDDD}${cleaned}`;
  }

  if (cleaned.length === 10 || cleaned.length === 11) {
      return { number: cleaned, note: '' };
  }

  return null;
}

function extractPhoneNumbers(cellContent) {
  if (!cellContent) return [];
  let cleanedContent = cellContent.replace(/[\(\)\-\s]/g, '');
  const matches = cleanedContent.match(/(\*?\+?\d{3,15})/g);
  return matches || [];
}

app.post('/upload', upload.single('file'), (req, res) => {
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

        // Gera um novo arquivo Excel com os dados consolidados
        const newWorkbook = xlsx.utils.book_new();
        const newSheet = xlsx.utils.json_to_sheet(consolidatedData);
        xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'ConsolidatedData');
        const outputFilePath = path.join(__dirname, `uploads/${nomeplanilha}_contatos.xlsx`);
        xlsx.writeFile(newWorkbook, outputFilePath);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Retorna a URL do arquivo para download
        res.json({ downloadUrl: `http://localhost:3000/download/${path.basename(outputFilePath)}` });

    } catch (error) {
        console.error('Erro ao processar os contatos:', error);
        res.status(500).json({ error: 'Erro ao processar os contatos.' });
    }
});

app.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    res.download(filePath, (err) => {
        if (err) {
            console.error('Erro ao fazer download do arquivo:', err);
            res.status(500).json({ error: 'Erro ao fazer download do arquivo.' });
        }
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
