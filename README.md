# Contatos

API em Node.js/Express para processar planilhas de contatos recebidas via chatbot (Blip), normalizar números de telefone brasileiros e disponibilizar o resultado no Google Drive para download.

## Como funciona

1. Um arquivo de planilha (Excel) é enviado via `POST /api/upload`, junto com o DDD padrão e o nome da planilha.
2. A API baixa o arquivo (validando o link, inclusive checando expiração de links do `blipmediastore.blip.ai`).
3. Os dados são lidos e, para cada linha, o nome completo é montado e os números de telefone são extraídos e normalizados para o padrão brasileiro (DDD + número), incluindo tratamento de números internacionais, 0800 e números de operadora.
4. Uma nova planilha é gerada com os dados tratados, incluindo links clicáveis para envio de mensagem via WhatsApp (`=HIPERLINK(...)`).
5. A planilha processada é enviada para uma pasta no Google Drive (via Service Account) e disponibilizada publicamente para leitura.
6. O link de download é retornado na resposta da API.
7. O arquivo processado também pode ser baixado a partir do servidor via `GET /api/download/:fileId`, que faz streaming do arquivo diretamente do Google Drive.

## Stack

- **Node.js** + **Express**
- **googleapis** — integração com Google Drive (upload/download via Service Account)
- **xlsx** — leitura e escrita de planilhas Excel
- **axios** — download do arquivo de origem
- **streamifier** — conversão de buffer em stream para upload
- Demais dependências instaladas mas não utilizadas nas rotas atuais: `bcrypt`, `cors`, `handlebars`, `joi`, `jsonwebtoken`, `knex`, `multer`, `nodemailer`, `pg`

## Endpoints

| Método | Rota                  | Descrição                                                                 |
|--------|-----------------------|----------------------------------------------------------------------------|
| POST   | `/api/upload`         | Recebe `{ defaultDDD, nomePlanilha, file }`, processa e envia ao Drive     |
| GET    | `/api/download/:fileId` | Faz streaming de um arquivo do Google Drive pelo `fileId`               |

## Pré-requisitos

- Node.js
- Uma conta de serviço (Service Account) do Google Cloud com acesso à API do Google Drive
- Uma pasta no Google Drive compartilhada com essa conta de serviço

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com:

```
GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_DRIVE_FOLDER_ID=
PORT=3000
```

> `GOOGLE_PRIVATE_KEY` deve ser a chave privada da conta de serviço, com as quebras de linha (`\n`) preservadas conforme o formato do JSON de credenciais.

## Instalação

```bash
npm install
```

## Rodando localmente

```bash
npm run dev
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

## Deploy

O projeto está configurado para deploy na **Vercel** (`vercel.json`), com `server.js` como entry point serverless e as variáveis de ambiente `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` configuradas como secrets do projeto na Vercel.

## Estrutura do projeto

```
contatos/
├── api/
│   ├── upload.js      # Rota de upload/processamento da planilha
│   ├── download.js    # Rota de download de arquivo do Drive
│   └── utils.js        # Normalização e extração de números de telefone
├── server.js            # Configuração do Express e das rotas
├── vercel.json           # Configuração de deploy na Vercel
├── excel.mp4              # Vídeo demonstrativo do fluxo
└── planilhasGoogle.mp4    # Vídeo demonstrativo da integração com Google Sheets/Drive
```

## Licença

ISC
