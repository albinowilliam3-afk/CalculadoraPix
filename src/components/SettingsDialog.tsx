import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Loader2,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Wallet,
  X,
} from 'lucide-react';
import { formatArs, formatBrl, parseFlexibleDecimal } from '../lib/formatters';
import type { ResolvedTheme, ThemePreference } from '../lib/theme';
import { attachDialogFallbacks, closeTopLayerDialog } from '../lib/topLayerDialog';
import type {
  CalculatorConfig,
  PixProviderNormalized,
  UsdProviderQuote,
} from '../types/finance';

interface SettingsDialogProps {
  isOpen: boolean;
  config: CalculatorConfig;
  liveSpotUsdBrl: number;
  themePreference: ThemePreference;
  systemTheme: ResolvedTheme;
  oficialBanks: UsdProviderQuote[];
  pixProviders: PixProviderNormalized[];
  onChangeThemePreference: (pref: ThemePreference) => void;
  onClose: () => void;
  onUpdateConfig: (next: CalculatorConfig) => void;
  onRestoreLiveDefaults: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  config,
  liveSpotUsdBrl,
  themePreference,
  systemTheme,
  oficialBanks,
  pixProviders,
  onChangeThemePreference,
  onClose,
  onUpdateConfig,
  onRestoreLiveDefaults,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [spreadInput, setSpreadInput] = useState(() =>
    (config.cardSpread * 100).toFixed(2).replace('.', ',')
  );
  const [spotOverrideInput, setSpotOverrideInput] = useState(() =>
    config.customSpotUsdBrl ? String(config.customSpotUsdBrl).replace('.', ',') : ''
  );

  useEffect(() => {
    setSpreadInput((config.cardSpread * 100).toFixed(2).replace('.', ','));
    setSpotOverrideInput(
      config.customSpotUsdBrl ? String(config.customSpotUsdBrl).replace('.', ',') : ''
    );
  }, [config]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const cleanup = attachDialogFallbacks(dialog, () => {
      void handleRequestClose();
    });

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      void closeTopLayerDialog(dialog);
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleRequestClose = async () => {
    await closeTopLayerDialog(dialogRef.current);
    onClose();
  };

  const handleSpreadChange = (raw: string) => {
    setSpreadInput(raw);
    const pct = parseFlexibleDecimal(raw);
    if (pct >= 0 && pct <= 15) {
      onUpdateConfig({
        ...config,
        cardSpread: pct / 100,
      });
    }
  };

  const handleSpotOverrideChange = (raw: string) => {
    setSpotOverrideInput(raw);
    if (!raw.trim()) {
      onUpdateConfig({
        ...config,
        customSpotUsdBrl: null,
      });
      return;
    }
    const val = parseFlexibleDecimal(raw);
    if (val > 1 && val < 20) {
      onUpdateConfig({
        ...config,
        customSpotUsdBrl: val,
      });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="settings-dialog-title"
      onClose={onClose}
      className="app-sheet"
    >
      <div className="max-h-[88dvh] overflow-y-auto p-5 pb-safe">
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[var(--border-subtle)]" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5664F5]/15 text-[var(--brand-primary)]">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="settings-dialog-title"
                className="text-base font-extrabold text-[var(--text-primary)]"
              >
                Aparência &amp; Calibração
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Tema do app e parâmetros das fórmulas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleRequestClose()}
            aria-label="Fechar configurações"
            className="bank-subtle flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleRequestClose();
          }}
          className="mt-5 space-y-4"
        >
          {/* 0. Seletor de Tema: Branco / Negro / Sistema (`dark-mode-toggle`) */}
          <fieldset className="bank-subtle rounded-2xl p-3.5">
            <legend className="px-1 text-xs font-bold text-[var(--text-primary)]">
              Tema da Interface
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'light', label: 'Branco', icon: Sun },
                  { id: 'dark', label: 'Negro', icon: Moon },
                  {
                    id: 'system',
                    label: `Auto (${systemTheme === 'dark' ? 'Negro' : 'Branco'})`,
                    icon: Monitor,
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = themePreference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeThemePreference(opt.id)}
                    aria-pressed={active}
                    className={`flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold transition ${
                      active
                        ? 'bg-[#5664F5] text-white shadow-sm'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate max-w-full">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* 1. Instituições Padrão (Cartão & Pix) */}
          <div className="bank-subtle rounded-2xl p-3.5 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
                <span>Instituições Padrão ao Abrir o App</span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                Escolha o banco oficial e a carteira Pix que carregarão como padrão permanente.
              </p>
            </div>

            <div>
              <label
                htmlFor="default-bank-select"
                className="block text-xs font-bold text-[var(--text-primary)]"
              >
                Banco Padrão do Cartão
              </label>
              <select
                id="default-bank-select"
                value={config.defaultBankSlug || 'uala'}
                onChange={(e) => {
                  onUpdateConfig({
                    ...config,
                    defaultBankSlug: e.target.value,
                  });
                }}
                className="bank-input mt-1.5 w-full rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-card)] cursor-pointer"
              >
                {oficialBanks.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.prettyName} (Dólar Oficial: ${formatArs(b.ask || 0, 0)})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <label
                htmlFor="default-pix-select"
                className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]"
              >
                <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                <span>Carteira Pix Padrão</span>
              </label>
              <select
                id="default-pix-select"
                value={config.defaultPixSlug || 'banco-galicia'}
                onChange={(e) => {
                  onUpdateConfig({
                    ...config,
                    defaultPixSlug: e.target.value,
                  });
                }}
                className="bank-input mt-1.5 w-full rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-card)] cursor-pointer"
              >
                {pixProviders.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.prettyName} (${formatArs(p.effectiveArsPerBrl || 0)} / R$ 1)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Spread da Bandeira */}
          <div className="bank-subtle rounded-2xl p-3.5">
            <label
              htmlFor="spread-bandeira-input"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              Spread Interbancário da Bandeira Visa/Master (%)
            </label>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Margem média das bandeiras Visa e Mastercard (padrão recomendado: <strong>0,79%</strong>).
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <input
                id="spread-bandeira-input"
                name="cardSpread"
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                value={spreadInput}
                onChange={(e) => handleSpreadChange(e.target.value)}
                className="bank-input w-full rounded-xl px-3 py-2.5 text-base font-bold text-[var(--text-primary)] tabular-nums"
              />
              <span className="text-sm font-bold text-[var(--text-secondary)]">%</span>
            </div>

            <div className="mt-2 flex gap-1.5">
              {[
                { label: '0,00% Puro', val: '0,00' },
                { label: '0,79% Real', val: '0,79' },
                { label: '1,50% Conservador', val: '1,50' },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleSpreadChange(preset.val)}
                  className="rounded-lg bg-[var(--bg-card)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Câmbio Spot USD/BRL */}
          <div className="bank-subtle rounded-2xl p-3.5">
            <label
              htmlFor="spot-usdbrl-input"
              className="block text-xs font-bold text-[var(--text-primary)]"
            >
              Câmbio Comercial Spot USD/BRL (Opcional)
            </label>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)] tabular-nums">
              Deixe vazio para usar o Spot ao vivo (atual: R$ {formatBrl(liveSpotUsdBrl)}).
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text-secondary)]">R$</span>
              <input
                id="spot-usdbrl-input"
                name="spotUsdBrl"
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                placeholder={`Auto (${formatBrl(liveSpotUsdBrl)})`}
                value={spotOverrideInput}
                onChange={(e) => handleSpotOverrideChange(e.target.value)}
                className="bank-input w-full rounded-xl px-3 py-2.5 text-base font-bold text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-muted)]"
              />
              {config.customSpotUsdBrl && (
                <button
                  type="button"
                  onClick={() => handleSpotOverrideChange('')}
                  className="shrink-0 rounded-xl bg-[var(--bg-card)] px-3 py-2.5 text-xs font-bold text-[var(--brand-primary)]"
                >
                  Auto
                </button>
              )}
            </div>
          </div>

          {/* 3. Filtro Anti-Impulso David */}
          <div className="bank-subtle flex items-center justify-between gap-3 rounded-2xl p-3.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--brand-primary)] mt-0.5" />
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  Modo &ldquo;De Olho no David&rdquo; 👀
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Recados diretos pro David e pop-up 3D de alerta acima de R$ 400.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={config.davidGuardEnabled}
              onClick={() =>
                onUpdateConfig({
                  ...config,
                  davidGuardEnabled: !config.davidGuardEnabled,
                })
              }
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                config.davidGuardEnabled ? 'bg-[#5664F5]' : 'bg-slate-400/50'
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  config.davidGuardEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 4. Ações Rápidas (Reset de Fábrica) */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isResetting}
              onClick={() => {
                setIsResetting(true);
                onRestoreLiveDefaults();
                setTimeout(() => {
                  setIsResetting(false);
                  void handleRequestClose();
                }, 350);
              }}
              className="bank-subtle flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold text-[var(--text-primary)] active:scale-95 transition disabled:opacity-60 cursor-pointer"
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--brand-primary)]" />
              ) : (
                <RotateCcw className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
              )}
              <span>
                {isResetting
                  ? 'Redefinindo padrões...'
                  : 'Redefinir para Padrões de Fábrica'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] rounded-2xl bg-[#5664F5] font-extrabold text-sm text-white shadow-md shadow-indigo-500/25 active:scale-[0.99] transition"
          >
            Concluído
          </button>
        </form>
      </div>
    </dialog>
  );
};
