# ARS2BRL Smart Converter 🇦🇷⇄🇧🇷

Aplicação web moderna **mobile-first (PWA Dark Mode estilo Samsung One UI / iOS)** para calcular em tempo real a **cotação efetiva oculta do Cartão de Crédito/Débito em USD na Argentina (via Dólar Oficial bancário)** para compras em Reais (`BRL`) no Brasil, comparando-a contra o **ARQ (antigo DolarApp)** e todas as carteiras **Pix**.

## Como Subir no Netlify (`https://app.netlify.com/`)

### Opção 1: Deploy Completo com Serverless Proxy (Recomendado — via GitHub)
1. Suba esta pasta para um repositório no seu GitHub.
2. Acesse `https://app.netlify.com/` → **Add new site** → **Import an existing project**.
3. Selecione o repositório — o arquivo `netlify.toml` já configura tudo automaticamente:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions` (proxy sem bloqueio de CORS para `api.comparapix.ar/quotes`, `api.comparadolar.ar/usd` e `economia.awesomeapi.com.br`).

### Opção 2: Deploy Instantâneo Arrastando a Pasta (`Netlify Drop`)
1. Rode `npm run build` localmente.
2. Arraste a pasta gerada `dist/` diretamente em `https://app.netlify.com/drop`.
   *(Mesmo sem Serverless Functions, o app possui fallback automático anti-CORS multi-camada e cache offline em `localStorage`!)*

## Como Instalar como App no Samsung Galaxy (One UI)
1. Abra o link do Netlify no **Chrome** ou **Samsung Internet** do seu Galaxy.
2. Toque no botão **"App"** no topo da tela (ou nos **3 pontinhos ⋮ → Adicionar à tela inicial → Instalar**).
3. O **ARS2BRL** será instalado como aplicativo nativo em tela cheia na gaveta de apps da One UI!
