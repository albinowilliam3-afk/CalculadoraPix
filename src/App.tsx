import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DavidWarningModal } from './components/DavidWarningModal';
import { InstallAppDialog } from './components/InstallAppDialog';
import { LiveHeader } from './components/LiveHeader';
import { RankingTabs } from './components/RankingTabs';
import { SettingsDialog } from './components/SettingsDialog';
import { SmartConverterHero } from './components/SmartConverterHero';
import {
  CALIBRATED_FALLBACK_BUNDLE,
  fetchLiveMarketBundle,
  loadCachedMarketBundle,
} from './lib/apiService';
import {
  calculateDualCardQuotes,
  DEFAULT_CONFIG,
  getDavidSpendingFeedback,
  simulateRealPurchase,
} from './lib/calculator';
import { formatArs, parseFlexibleDecimal } from './lib/formatters';
import {
  applyThemeMeta,
  computeNextToggledPreference,
  getStoredThemePreference,
  getSystemTheme,
  persistThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from './lib/theme';
import type {
  CalculatorConfig,
  LiveMarketBundle,
  PersistedUserState,
} from './types/finance';

const USER_STATE_KEY = 'ars2brl_user_state_v2';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const HIGH_SPEND_MODAL_THRESHOLD_BRL = 400;

function loadInitialUserState(initialBundle: LiveMarketBundle): PersistedUserState {
  try {
    const raw = localStorage.getItem(USER_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedUserState>;
      return {
        arqRateInput:
          parsed.arqRateInput ||
          formatArs(initialBundle.arqLiveRate ?? 308),
        isArqManual: Boolean(parsed.isArqManual),
        selectedBankSlug:
          parsed.selectedBankSlug ||
          initialBundle.oficialBanks[0]?.slug ||
          'brubank-ultra',
        manualOficialInput: parsed.manualOficialInput || '1540',
        purchaseBrlInput: parsed.purchaseBrlInput || '100',
        arsBudgetInput: parsed.arsBudgetInput || '30000',
        converterDirection: parsed.converterDirection || 'BRL_TO_ARS',
        config: {
          ...DEFAULT_CONFIG,
          ...(parsed.config || {}),
        },
      };
    }
  } catch {
    // Ignore storage read error
  }

  return {
    arqRateInput: formatArs(initialBundle.arqLiveRate ?? 308),
    isArqManual: false,
    selectedBankSlug: initialBundle.oficialBanks[0]?.slug || 'brubank-ultra',
    manualOficialInput: '1540',
    purchaseBrlInput: '100',
    arsBudgetInput: '30000',
    converterDirection: 'BRL_TO_ARS',
    config: DEFAULT_CONFIG,
  };
}

export const App: React.FC = () => {
  const [market, setMarket] = useState<LiveMarketBundle>(
    () => loadCachedMarketBundle() ?? CALIBRATED_FALLBACK_BUNDLE
  );

  const [userState, setUserState] = useState<PersistedUserState>(() =>
    loadInitialUserState(loadCachedMarketBundle() ?? CALIBRATED_FALLBACK_BUNDLE)
  );

  const [themePref, setThemePref] = useState<ThemePreference>(() =>
    getStoredThemePreference()
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme()
  );

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInstallOpen, setIsInstallOpen] = useState<boolean>(false);
  const [isDavidModalOpen, setIsDavidModalOpen] = useState<boolean>(false);
  const [davidModalVariant, setDavidModalVariant] = useState<number>(0);
  const [inlinePhraseSeed, setInlinePhraseSeed] = useState<number>(0);
  const lastAlertedAmountRef = useRef<number | null>(
    parseFlexibleDecimal(userState.purchaseBrlInput) >= HIGH_SPEND_MODAL_THRESHOLD_BRL
      ? parseFlexibleDecimal(userState.purchaseBrlInput)
      : null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [, setTickMinute] = useState<number>(0);

  const resolvedTheme = useMemo(
    () => resolveTheme(themePref, systemTheme),
    [systemTheme, themePref]
  );

  useEffect(() => {
    applyThemeMeta(themePref, systemTheme);
  }, [themePref, systemTheme]);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        setThemePref(getStoredThemePreference());
      }
    };

    mql.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      mql.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3600);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const handleToggleHeaderTheme = () => {
    const nextPref = computeNextToggledPreference(themePref, systemTheme);
    persistThemePreference(nextPref);
    setThemePref(nextPref);
  };

  const handleExplicitThemeChange = (nextPref: ThemePreference) => {
    persistThemePreference(nextPref);
    setThemePref(nextPref);
  };

  useEffect(() => {
    try {
      localStorage.setItem(USER_STATE_KEY, JSON.stringify(userState));
    } catch {
      // Ignore quota errors
    }
  }, [userState]);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsStandalone(true);
      showToast('🎉 Aplicativo instalado na tela inicial!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  useEffect(() => {
    const id = window.setInterval(() => setTickMinute((n) => n + 1), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const refreshQuotes = useCallback(
    async (silent = false) => {
      setIsRefreshing(true);
      try {
        const fresh = await fetchLiveMarketBundle();
        setMarket(fresh);

        setUserState((prev) => {
          let nextArqInput = prev.arqRateInput;
          if (!prev.isArqManual && fresh.arqLiveRate && fresh.arqLiveRate > 0) {
            nextArqInput = formatArs(fresh.arqLiveRate);
          }

          let nextBankSlug = prev.selectedBankSlug;
          if (
            nextBankSlug !== 'manual' &&
            fresh.usdProviders.length > 0 &&
            !fresh.usdProviders.some((b) => b.slug === nextBankSlug)
          ) {
            nextBankSlug = fresh.oficialBanks[0]?.slug || fresh.usdProviders[0].slug;
          }

          return {
            ...prev,
            arqRateInput: nextArqInput,
            selectedBankSlug: nextBankSlug,
          };
        });

        if (!silent) {
          showToast('⚡ Cotações atualizadas em tempo real!');
        }
      } catch {
        if (!silent) {
          showToast('📡 Sem conexão — usando último cache salvo no celular.');
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    void refreshQuotes(true);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshQuotes(true);
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshQuotes(true);
      }
    }, 90_000);

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, [refreshQuotes]);

  const { activeOficialRate, activeBankName } = useMemo(() => {
    if (userState.selectedBankSlug === 'manual') {
      const manualVal = parseFlexibleDecimal(userState.manualOficialInput);
      return {
        activeOficialRate: manualVal > 0 ? manualVal : 1540,
        activeBankName: 'Manual',
      };
    }

    const found =
      market.usdProviders.find((b) => b.slug === userState.selectedBankSlug) ||
      market.oficialBanks[0];

    if (found && found.ask && found.ask > 0) {
      return {
        activeOficialRate: found.ask,
        activeBankName: found.prettyName,
      };
    }

    return {
      activeOficialRate: 1547,
      activeBankName: 'Oficial',
    };
  }, [
    market.oficialBanks,
    market.usdProviders,
    userState.manualOficialInput,
    userState.selectedBankSlug,
  ]);

  const cotacaoArqNumeric = useMemo(
    () => parseFlexibleDecimal(userState.arqRateInput),
    [userState.arqRateInput]
  );

  const valorBrlNumeric = useMemo(
    () => parseFlexibleDecimal(userState.purchaseBrlInput),
    [userState.purchaseBrlInput]
  );

  const dualQuotes = useMemo(
    () =>
      calculateDualCardQuotes({
        cotacaoArq: cotacaoArqNumeric,
        dolarOficial: activeOficialRate,
        liveSpotUsdBrl: market.spotUsdBrl.bid,
        config: userState.config,
      }),
    [activeOficialRate, cotacaoArqNumeric, market.spotUsdBrl.bid, userState.config]
  );

  const simulation = useMemo(
    () =>
      simulateRealPurchase({
        valorBrl: valorBrlNumeric,
        cotacaoArq: cotacaoArqNumeric,
        dolarOficialBanco: activeOficialRate,
        usdBrlBandeira: dualQuotes.usdBrlBandeira,
        metodoACotacaoEstimada: dualQuotes.metodoACotacaoEstimada,
      }),
    [
      activeOficialRate,
      cotacaoArqNumeric,
      dualQuotes.metodoACotacaoEstimada,
      dualQuotes.usdBrlBandeira,
      valorBrlNumeric,
    ]
  );

  const davidFeedback = useMemo(
    () =>
      getDavidSpendingFeedback(
        valorBrlNumeric,
        simulation.economiaTotalArs,
        userState.config.davidGuardEnabled,
        inlinePhraseSeed
      ),
    [
      inlinePhraseSeed,
      simulation.economiaTotalArs,
      userState.config.davidGuardEnabled,
      valorBrlNumeric,
    ]
  );

  // Dispara automaticamente o pop-up moderno 3D quando o usuário digita R$ 400+
  useEffect(() => {
    if (
      !userState.config.davidGuardEnabled ||
      userState.converterDirection === 'ARS_TO_BRL'
    ) {
      return;
    }

    if (valorBrlNumeric < HIGH_SPEND_MODAL_THRESHOLD_BRL) {
      lastAlertedAmountRef.current = null;
      return;
    }

    if (lastAlertedAmountRef.current === valorBrlNumeric) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastAlertedAmountRef.current = valorBrlNumeric;
      setDavidModalVariant((v) => v + 1);
      setIsDavidModalOpen(true);
    }, 480);

    return () => window.clearTimeout(timer);
  }, [
    userState.config.davidGuardEnabled,
    userState.converterDirection,
    valorBrlNumeric,
  ]);

  const pixSourceLabel = useMemo(() => {
    if (market.pixSource === 'comparapix-proxy' || market.pixSource === 'comparapix-cors') {
      return 'ComparaPix + ComparaDólar';
    }
    if (market.pixSource === 'criptoya') {
      return 'CriptoYa + ComparaDólar';
    }
    return 'Cache Local';
  }, [market.pixSource]);

  const handleTriggerNativeInstall = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredInstallPrompt(null);
    }
  };

  const handleLoadEmpiricalBenchmark = () => {
    setUserState((prev) => ({
      ...prev,
      converterDirection: 'BRL_TO_ARS',
      arqRateInput: '330,30',
      isArqManual: true,
      selectedBankSlug: 'manual',
      manualOficialInput: '1540',
      purchaseBrlInput: '10,64',
      config: {
        ...prev.config,
        cardSpread: 0.0079,
        customSpotUsdBrl: 4.9652,
      },
    }));
    showToast('🎯 Benchmark R$ 10,64 → US$ 2,16 ($3.326,40 ARS) carregado!');
  };

  const handleRestoreLiveDefaults = () => {
    const liveArq = market.arqLiveRate ?? 308;
    const topBank = market.oficialBanks[0]?.slug || 'brubank-ultra';
    setUserState((prev) => ({
      ...prev,
      converterDirection: 'BRL_TO_ARS',
      arqRateInput: formatArs(liveArq),
      isArqManual: false,
      selectedBankSlug: topBank,
      purchaseBrlInput: '100',
      arsBudgetInput: '30000',
      config: {
        ...DEFAULT_CONFIG,
        davidGuardEnabled: prev.config.davidGuardEnabled,
      },
    }));
    showToast('⚡ Valores ao vivo restaurados!');
  };

  const handleSecretTripleTap = () => {
    setUserState((prev) => {
      const nextEnabled = !prev.config.davidGuardEnabled;
      showToast(
        nextEnabled
          ? '👀 Modo "De olho no David" ATIVADO! Se controla hein!'
          : '🙈 Modo livre — parei de vigiar o cartão do David (por sua conta e risco!).'
      );
      return {
        ...prev,
        config: {
          ...prev.config,
          davidGuardEnabled: nextEnabled,
        },
      };
    });
  };

  const handlePurchaseBrlChange = (val: string, isInstantPreset = false) => {
    setUserState((prev) => ({
      ...prev,
      purchaseBrlInput: val,
    }));

    const numeric = parseFlexibleDecimal(val);
    if (
      isInstantPreset &&
      userState.config.davidGuardEnabled &&
      numeric >= HIGH_SPEND_MODAL_THRESHOLD_BRL
    ) {
      lastAlertedAmountRef.current = numeric;
      setDavidModalVariant((v) => v + 1);
      setIsDavidModalOpen(true);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <LiveHeader
        fetchedAt={market.fetchedAt}
        isRefreshing={isRefreshing}
        isFromCache={market.isFromCache}
        pixSourceLabel={pixSourceLabel}
        canInstallPwa={Boolean(deferredInstallPrompt)}
        isStandalone={isStandalone}
        davidGuardEnabled={userState.config.davidGuardEnabled}
        resolvedTheme={resolvedTheme}
        onToggleTheme={handleToggleHeaderTheme}
        onRefresh={() => void refreshQuotes(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstall={() => setIsInstallOpen(true)}
        onSecretLogoTripleTap={handleSecretTripleTap}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="bank-surface fixed top-20 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 rounded-2xl px-4 py-3 text-xs font-bold text-[var(--text-primary)] backdrop-blur-xl"
        >
          {toastMessage}
        </div>
      )}

      <main className="mx-auto w-full max-w-lg flex-1 space-y-4 px-4 py-4 pb-safe">
        {/* CONVERSOR BANCÁRIO DIRETO NO TOPO: R$ 100 -> $ 28.960 ARS */}
        <SmartConverterHero
          direction={userState.converterDirection || 'BRL_TO_ARS'}
          purchaseBrlInput={userState.purchaseBrlInput}
          arsBudgetInput={userState.arsBudgetInput || '30000'}
          arqRateInput={userState.arqRateInput}
          isArqManual={userState.isArqManual}
          arqLiveRate={market.arqLiveRate}
          cotacaoArqNumeric={cotacaoArqNumeric}
          oficialBanks={market.oficialBanks}
          selectedBankSlug={userState.selectedBankSlug}
          manualOficialInput={userState.manualOficialInput}
          activeOficialRate={activeOficialRate}
          activeBankName={activeBankName}
          cardSpreadPct={userState.config.cardSpread * 100}
          quotes={dualQuotes}
          simulation={simulation}
          davidFeedback={davidFeedback}
          onToggleDirection={() =>
            setUserState((prev) => ({
              ...prev,
              converterDirection:
                prev.converterDirection === 'ARS_TO_BRL'
                  ? 'BRL_TO_ARS'
                  : 'ARS_TO_BRL',
            }))
          }
          onPurchaseBrlChange={handlePurchaseBrlChange}
          onArsBudgetChange={(val) =>
            setUserState((prev) => ({
              ...prev,
              arsBudgetInput: val,
            }))
          }
          onArqInputChange={(val) =>
            setUserState((prev) => ({
              ...prev,
              arqRateInput: val,
              isArqManual: true,
            }))
          }
          onResetArqToLive={() => {
            if (!market.arqLiveRate) return;
            setUserState((prev) => ({
              ...prev,
              arqRateInput: formatArs(market.arqLiveRate!),
              isArqManual: false,
            }));
            showToast(`Cotação ARQ sincronizada: $${formatArs(market.arqLiveRate)}`);
          }}
          onSelectBank={(slug) => {
            setUserState((prev) => ({
              ...prev,
              selectedBankSlug: slug,
            }));
          }}
          onManualOficialChange={(val) =>
            setUserState((prev) => ({
              ...prev,
              selectedBankSlug: 'manual',
              manualOficialInput: val,
            }))
          }
          onCycleInlinePhrase={() => setInlinePhraseSeed((s) => s + 1)}
          onOpenHighSpendModal={() => {
            setDavidModalVariant((v) => v + 1);
            setIsDavidModalOpen(true);
          }}
        />

        <RankingTabs
          pixProviders={market.pixProviders}
          usdProviders={market.usdProviders}
          cardReferenceRate={dualQuotes.cardReferenceRate}
          activeBankName={activeBankName}
          activeOficialRate={activeOficialRate}
          selectedBankSlug={userState.selectedBankSlug}
          onSelectPixRateForHero={(rate, providerName) => {
            setUserState((prev) => ({
              ...prev,
              arqRateInput: formatArs(rate),
              isArqManual: true,
            }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showToast(`Comparando Cartão contra ${providerName} ($${formatArs(rate)})`);
          }}
          onSelectOficialBank={(slug, bankName, ask) => {
            setUserState((prev) => ({
              ...prev,
              selectedBankSlug: slug,
            }));
            showToast(
              `Banco base alterado para ${bankName} ($${formatArs(ask, ask % 1 === 0 ? 0 : 2)})`
            );
          }}
        />

        <footer className="pt-2 pb-4 text-center text-[11px] text-[var(--text-muted)] space-y-1">
          <p>
            Cotações em tempo real via{' '}
            <a
              href="https://comparapix.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--text-secondary)] underline decoration-[var(--border-subtle)] underline-offset-2"
            >
              ComparaPix.ar
            </a>{' '}
            &amp;{' '}
            <a
              href="https://comparadolar.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--text-secondary)] underline decoration-[var(--border-subtle)] underline-offset-2"
            >
              ComparaDólar.ar
            </a>
          </p>
          <p className="text-[10px] opacity-80">
            PesoPix • Calculadora Pix, Pesos &amp; Cartão (sempre de olho no David 👀)
          </p>
        </footer>
      </main>

      <DavidWarningModal
        isOpen={isDavidModalOpen}
        valorBrl={valorBrlNumeric}
        custoTotalArs={simulation.custoTotalCartaoArs}
        dolaresFatura={simulation.dolaresFatura}
        variantIndex={davidModalVariant}
        onAccept={() => setIsDavidModalOpen(false)}
        onLowerToSafeAmount={() => {
          lastAlertedAmountRef.current = null;
          setIsDavidModalOpen(false);
          setUserState((prev) => ({
            ...prev,
            purchaseBrlInput: '100',
          }));
          showToast('👏 Aí sim, David! Voltou pros R$ 100 — orgulho de você!');
        }}
        onNextVariant={() => setDavidModalVariant((v) => v + 1)}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        config={userState.config}
        liveSpotUsdBrl={market.spotUsdBrl.bid}
        themePreference={themePref}
        systemTheme={systemTheme}
        onChangeThemePreference={handleExplicitThemeChange}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateConfig={(next: CalculatorConfig) =>
          setUserState((prev) => ({ ...prev, config: next }))
        }
        onLoadEmpiricalBenchmark={handleLoadEmpiricalBenchmark}
        onRestoreLiveDefaults={handleRestoreLiveDefaults}
      />

      <InstallAppDialog
        isOpen={isInstallOpen}
        canTriggerNativeInstall={Boolean(deferredInstallPrompt)}
        onTriggerNativeInstall={handleTriggerNativeInstall}
        onClose={() => setIsInstallOpen(false)}
      />
    </div>
  );
};

export default App;
