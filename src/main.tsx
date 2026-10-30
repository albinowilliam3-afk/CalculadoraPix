import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Registro com Auto-Update automático e silencioso
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Quando uma versão nova sobe no Netlify, ativa imediatamente sem esperar fechar abas
    updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Checa por atualizações a cada 20 segundos enquanto a aba estiver aberta
      window.setInterval(() => {
        void registration.update();
      }, 20_000);

      // Re-checa assim que o usuário volta para o app ou tela
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update();
        }
      });
      window.addEventListener('focus', () => {
        void registration.update();
      });
    }
  },
});

// Recarrega automaticamente assim que o novo Service Worker assumir o controle
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
