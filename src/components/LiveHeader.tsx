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
import { formatRelativeTime } from '../lib/formatters';
import type { ResolvedTheme } from '../lib/theme';

interface LiveHeaderProps {
  fetchedAt: string | null;
  isRefreshing: boolean;
  isFromCache: boolean;
  pixSourceLabel: string;
  canInstallPwa: boolean;
  isStandalone: boolean;
  davidGuardEnabled: boolean;
  resolvedTheme: ResolvedTheme;
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
      <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
        {/* Avatar Circular Estilo Banco Digital + Título */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleLogoTap}
            title="PesoPix • Calculadora Inteligente"
            aria-label="Logo PesoPix Calculadora"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl active:scale-95 transition-transform"
          >
            <img
              src="/web-icon.png"
              alt="Logo PesoPix"
              width={44}
              height={44}
              className="h-11 w-11 object-contain drop-shadow-sm rounded-xl"
            />
            {davidGuardEnabled && (
              <span
                className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[var(--bg-app)] text-[8px] font-bold text-white shadow-sm"
                title="De olho nos gastos do David"
              >
                👀
              </span>
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-[17px] font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
                PesoPix
              </h1>
              <span className="rounded-md bg-[#5664F5]/14 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--brand-primary)]">
                Calc
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              {isRefreshing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--brand-primary)] shrink-0" />
                  <span className="truncate font-bold text-[var(--brand-primary)]">
                    Atualizando cotações...
                  </span>
                </>
              ) : isFromCache ? (
                <>
                  <WifiOff className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="truncate">
                    Offline • {formatRelativeTime(fetchedAt)}
                  </span>
                </>
              ) : (
                <>
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
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
        <div className="flex items-center gap-1.5 shrink-0">
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
            className="bank-surface flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--text-primary)] transition active:scale-95"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[#5664F5]" />
            )}
          </button>

          {!isStandalone && (
            <button
              type="button"
              onClick={onOpenInstall}
              aria-label="Instalar aplicativo no celular"
              title="Criar atalho / instalar app"
              className={`flex h-10 items-center gap-1.5 rounded-2xl px-2.5 text-xs font-bold transition active:scale-95 ${
                canInstallPwa
                  ? 'bg-[#5664F5] text-white shadow-md shadow-indigo-500/25'
                  : 'bank-surface text-[var(--text-primary)]'
              }`}
            >
              <Download className="h-4 w-4 shrink-0" />
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Atualizar cotações agora"
            className="bank-surface flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--text-primary)] transition active:scale-95 disabled:opacity-75"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-primary)]" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Abrir configurações avançadas e calibração"
            className="bank-surface flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--text-primary)] transition active:scale-95"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
