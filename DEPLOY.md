# Deploy do Portal do Pai

## 1. Pre-requisitos

- Projeto do Supabase de producao criado e acessivel
- API de geracao de PDF publicada em producao
- Conta na Vercel com acesso ao repositorio ou ao codigo local
- Dominio oficial definido

## 2. Variaveis de ambiente

Configure estas variaveis no ambiente de producao:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_EDUCRM_API_URL`

Use o arquivo `.env.example` como referencia para os nomes.

## 3. Passos de publicacao

1. Entrar na pasta `portal`
2. Validar a build com `npm run build`
3. Criar um projeto na Vercel apontando para esta pasta
4. Informar as variaveis de ambiente
5. Publicar
6. Conectar o dominio final

## 4. Regras de roteamento

O portal usa `BrowserRouter`, entao a hospedagem precisa sempre responder `index.html` para as rotas do frontend.

O arquivo `vercel.json` ja deixa isso preparado para Vercel no modo SPA.

Se a API tambem for hospedada no mesmo projeto Vercel, essa regra precisa ser ajustada antes da publicacao para nao interceptar caminhos sob `/api`.

## 5. Checklist de homologacao

- Acessar `/login`
- Informar um CPF valido
- Confirmar recebimento do codigo
- Entrar no dashboard
- Solicitar um documento manual
- Solicitar um documento automatico
- Baixar o PDF gerado
- Validar um protocolo em `/secretaria/validar/:protocol` quando publicado em subpasta
- Relatar problema em um documento emitido

## 6. Validacao publica do PDF

Ao publicar em dominio/subpasta, o gerador externo de PDF deve apontar o QR Code e o texto "Valide em:" para a URL publica final.

Exemplo deste projeto em HostGator:

- `https://SEU-DOMINIO/secretaria/validar/SEC-2026-6781`

Nunca usar URLs locais como `http://localhost:5173/validar/...` em documentos emitidos.

## 7. Pendencias externas

O frontend esta pronto para build, mas depende de itens fora deste repositorio:

- Credenciais reais do Supabase
- Politicas RLS revisadas nas tabelas usadas pelo portal
- API `/api/generate-pdf` publicada
- Integracao de envio de mensagens operante
