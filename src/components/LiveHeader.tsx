import React, { useRef } from 'react';
import {
  Download,
  Loader2,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Sun,
  WifiOff,
} from 'lucide-react';
import { formatArs, formatBrl, formatRelativeTime } from '../lib/formatters';
import type { ResolvedTheme } from '../lib/theme';
import type { SpotUsdArsQuote, SpotUsdBrlQuote } from '../types/finance';

const GoogleGIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

interface LiveHeaderProps {
  fetchedAt: string | null;
  isRefreshing: boolean;
  isFromCache: boolean;
  pixSourceLabel: string;
  canInstallPwa: boolean;
  isStandalone: boolean;
  davidGuardEnabled: boolean;
  resolvedTheme: ResolvedTheme;
  spotUsdBrl?: SpotUsdBrlQuote;
  spotUsdArs?: SpotUsdArsQuote;
  onToggleTheme: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenInstall: () => void;
  onSecretLogoTripleTap: () => void;
}

export const LiveHeader: React.FC<LiveHeaderProps> = ({
  fetchedAt,
  isRefreshing,
  isFromCache,
  pixSourceLabel,
  canInstallPwa,
  isStandalone,
  davidGuardEnabled,
  resolvedTheme,
  spotUsdBrl,
  spotUsdArs,
  onToggleTheme,
  onRefresh,
  onOpenSettings,
  onOpenInstall,
  onSecretLogoTripleTap,
}) => {
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
    }
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      onSecretLogoTripleTap();
      return;
    }
    tapTimerRef.current = window.setTimeout(() => {
      tapCountRef.current = 0;
    }, 550);
  };

  return (
    <header
      style={{ backgroundColor: 'var(--bg-header)' }}
      className="sticky top-0 z-30 border-b border-[var(--border-subtle)] backdrop-blur-xl pt-safe"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
        {/* Avatar Circular Estilo Banco Digital + Título */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleLogoTap}
            title="PesoPix • Calculadora Inteligente"
            aria-label="Logo PesoPix Calculadora"
            className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl active:scale-95 transition-transform"
          >
            <img
              src="/web-icon.png"
              alt="Logo PesoPix"
              width={40}
              height={40}
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain drop-shadow-sm rounded-xl"
            />
            {davidGuardEnabled && (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[var(--bg-app)] text-[7px] sm:text-[8px] font-bold text-white shadow-sm"
                title="De olho nos gastos do David"
              >
                👀
              </span>
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <h1 className="text-[15px] sm:text-[17px] font-black tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap">
                PesoPix
              </h1>
              <span className="rounded-md bg-[#5664F5]/12 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold tracking-tight text-[var(--brand-primary)] whitespace-nowrap">
                Calculadora
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[var(--text-muted)]">
              {isRefreshing ? (
                <>
                  <Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin text-[var(--brand-primary)] shrink-0" />
                  <span className="truncate font-bold text-[var(--brand-primary)]">
                    Atualizando...
                  </span>
                </>
              ) : isFromCache ? (
                <>
                  <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500 shrink-0" />
                  <span className="truncate">
                    Offline • {formatRelativeTime(fetchedAt)}
                  </span>
                </>
              ) : (
                <>
                  <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="truncate" title={pixSourceLabel}>
                    Ao vivo • {formatRelativeTime(fetchedAt)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botões Clean Estilo Banking App */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Botão Alternar Tema Branco / Negro */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              resolvedTheme === 'dark'
                ? 'Mudar para tema branco (claro)'
                : 'Mudar para tema negro (escuro)'
            }
            title={resolvedTheme === 'dark' ? 'Tema Branco' : 'Tema Negro'}
            className="bank-surface flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-primary)] transition active:scale-95"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#5664F5]" />
            )}
          </button>

          {!isStandalone && (
            <button
              type="button"
              onClick={onOpenInstall}
              aria-label="Instalar aplicativo no celular"
              title="Criar atalho / instalar app"
              className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-xs font-bold transition active:scale-95 ${
                canInstallPwa
                  ? 'bg-[#5664F5] text-white shadow-md shadow-indigo-500/25'
                  : 'bank-surface text-[var(--text-primary)]'
              }`}
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Atualizar cotações agora"
            className="bank-surface flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-primary)] transition active:scale-95 disabled:opacity-75"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-[var(--brand-primary)]" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Abrir configurações avançadas e calibração"
            className="bank-surface flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-primary)] transition active:scale-95"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* Sub-barra Câmbio Google em Tempo Real */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 px-3 sm:px-4 py-1.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-1.5">
          {/* Identificador Google Câmbio */}
          <div
            className="flex items-center gap-1.5 shrink-0"
            title="Cotações de referência comercial em tempo real (Google Finance / AwesomeAPI)"
          >
            <GoogleGIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10.5px] sm:text-[11px] font-bold text-[var(--text-secondary)] tracking-tight">
              Google Câmbio
            </span>
            <span className="hidden xs:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8.5px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ao vivo
            </span>
          </div>

          {/* Cotações Google USD/BRL e USD/ARS lado a lado */}
          <div className="flex items-center gap-1.5 sm:gap-2 tabular-nums">
            {/* USD -> BRL */}
            <div
              className="flex items-center gap-1 rounded-lg bg-[var(--bg-card)] px-1.5 py-0.5 shadow-sm border border-[var(--border-subtle)]"
              title="Cotação Dólar Comercial para Real (Google Finance)"
            >
              <span className="text-[9px] sm:text-[9.5px] font-bold text-[var(--text-muted)] tracking-wider">
                USD/BRL
              </span>
              <span className="text-[10.5px] sm:text-[11px] font-black text-[var(--text-primary)]">
                R$ {formatBrl(spotUsdBrl?.bid ?? 5.42)}
              </span>
            </div>

            {/* USD -> ARS */}
            <div
              className="flex items-center gap-1 rounded-lg bg-[var(--bg-card)] px-1.5 py-0.5 shadow-sm border border-[var(--border-subtle)]"
              title="Cotação Dólar Oficial para Peso Argentino (Google Finance)"
            >
              <span className="text-[9px] sm:text-[9.5px] font-bold text-[var(--text-muted)] tracking-wider">
                USD/ARS
              </span>
              <span className="text-[10.5px] sm:text-[11px] font-black text-[var(--text-primary)]">
                $ {formatArs(spotUsdArs?.bid ?? 1535.8, 2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
