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
  roundUp2Decimals,
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
  InputCurrencyMode,
  LiveMarketBundle,
  PaymentMode,
  PersistedUserState,
} from './types/finance';

const USER_STATE_KEY = 'pesopix_user_state_v3';
const LIVE_POLL_INTERVAL_MS = 25_000;
const HIGH_SPEND_MODAL_THRESHOLD_BRL = 400;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function resolveDefaultBankSlug(bundle: LiveMarketBundle): string {
  if (bundle.usdProviders.some((b) => b.slug === 'uala')) {
    return 'uala';
  }
  return bundle.oficialBanks[0]?.slug || 'uala';
}

function loadInitialUserState(initialBundle: LiveMarketBundle): PersistedUserState {
  const defaultBank = resolveDefaultBankSlug(initialBundle);
  const galiciaRate =
    initialBundle.pixProviders.find((p) => p.slug === 'banco-galicia')
      ?.effectiveArsPerBrl ?? 300.42;

  try {
    const raw = localStorage.getItem(USER_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedUserState>;
      const config: CalculatorConfig = {
        ...DEFAULT_CONFIG,
        ...(parsed.config || {}),
      };

      const isLegacyDefaultPix =
        !parsed.selectedPixSlug ||
        parsed.selectedPixSlug === 'arq' ||
        parsed.selectedPixSlug === 'banco-credicoop';

      const resolvedPixSlug = isLegacyDefaultPix
        ? config.defaultPixSlug || 'banco-galicia'
        : parsed.selectedPixSlug;

      return {
        arqRateInput:
          resolvedPixSlug === 'banco-galicia'
            ? formatArs(galiciaRate)
            : parsed.arqRateInput || formatArs(initialBundle.arqLiveRate ?? 308),
        isArqManual: Boolean(parsed.isArqManual),
        selectedBankSlug:
          parsed.selectedBankSlug || config.defaultBankSlug || defaultBank,
        selectedPixSlug: resolvedPixSlug,
        paymentMode: parsed.paymentMode || 'card',
        inputCurrency: parsed.inputCurrency || 'BRL',
        manualOficialInput: parsed.manualOficialInput || '1553',
        purchaseBrlInput: parsed.purchaseBrlInput || '100',
        usdAmountInput: parsed.usdAmountInput || '20',
        arsBudgetInput: parsed.arsBudgetInput || '30000',
        converterDirection: parsed.converterDirection || 'BRL_TO_ARS',
        config,
      };
    }
  } catch {
    // Ignore storage read error
  }

  return {
    arqRateInput: formatArs(galiciaRate),
    isArqManual: false,
    selectedBankSlug: DEFAULT_CONFIG.defaultBankSlug || defaultBank,
    selectedPixSlug: DEFAULT_CONFIG.defaultPixSlug || 'banco-galicia',
    paymentMode: 'card',
    inputCurrency: 'BRL',
    manualOficialInput: '1553',
    purchaseBrlInput: '100',
    usdAmountInput: '20',
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
  const [, setTickClock] = useState<number>(0);

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
    const t = window.setTimeout(() => setToastMessage(null), 3400);
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

  // Atualiza o rótulo relativo ("agora", "há 1 min") no cabeçalho
  useEffect(() => {
    const id = window.setInterval(() => setTickClock((n) => n + 1), 15_000);
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
          const activePixSlug = prev.selectedPixSlug || 'banco-galicia';
          const matchedPix = fresh.pixProviders.find((p) => p.slug === activePixSlug);

          if (!prev.isArqManual) {
            if (matchedPix?.effectiveArsPerBrl && matchedPix.effectiveArsPerBrl > 0) {
              nextArqInput = formatArs(matchedPix.effectiveArsPerBrl);
            } else if (fresh.arqLiveRate && fresh.arqLiveRate > 0) {
              nextArqInput = formatArs(fresh.arqLiveRate);
            }
          }

          let nextBankSlug = prev.selectedBankSlug;
          if (
            nextBankSlug !== 'manual' &&
            fresh.usdProviders.length > 0 &&
            !fresh.usdProviders.some((b) => b.slug === nextBankSlug)
          ) {
            nextBankSlug = resolveDefaultBankSlug(fresh);
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

  // Polling automático rápido (a cada 25s quando visível + ao focar/voltar online)
  useEffect(() => {
    void refreshQuotes(true);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshQuotes(true);
      }
    };

    const handleFocusOrOnline = () => {
      if (document.visibilityState === 'visible') {
        void refreshQuotes(true);
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshQuotes(true);
      }
    }, LIVE_POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
      window.clearInterval(interval);
    };
  }, [refreshQuotes]);

  const paymentMode: PaymentMode = userState.paymentMode || 'card';
  const inputCurrency: InputCurrencyMode = userState.inputCurrency || 'BRL';
  const selectedPixSlug = userState.selectedPixSlug || 'banco-galicia';

  const { activeOficialRate, activeBankName } = useMemo(() => {
    if (userState.selectedBankSlug === 'manual') {
      const manualVal = parseFlexibleDecimal(userState.manualOficialInput);
      return {
        activeOficialRate: manualVal > 0 ? manualVal : 1553,
        activeBankName: 'Manual',
      };
    }

    const found =
      market.usdProviders.find((b) => b.slug === userState.selectedBankSlug) ||
      market.usdProviders.find((b) => b.slug === 'uala') ||
      market.oficialBanks[0];

    if (found && found.ask && found.ask > 0) {
      return {
        activeOficialRate: found.ask,
        activeBankName: found.prettyName,
      };
    }

    return {
      activeOficialRate: 1553,
      activeBankName: 'Ualá',
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

  const { activePixProvider, activePixRate, activePixName } = useMemo(() => {
    const foundPix =
      market.pixProviders.find((p) => p.slug === selectedPixSlug) ||
      market.pixProviders.find((p) => p.slug === 'banco-galicia') ||
      market.pixProviders[0] ||
      null;

    if (userState.isArqManual) {
      return {
        activePixProvider: foundPix,
        activePixRate:
          cotacaoArqNumeric > 0
            ? cotacaoArqNumeric
            : (foundPix?.effectiveArsPerBrl ?? 300.42),
        activePixName: foundPix
          ? `${foundPix.prettyName} (manual)`
          : 'Pix Manual',
      };
    }

    if (foundPix && foundPix.effectiveArsPerBrl && foundPix.effectiveArsPerBrl > 0) {
      return {
        activePixProvider: foundPix,
        activePixRate: foundPix.effectiveArsPerBrl,
        activePixName: foundPix.prettyName,
      };
    }

    const defaultGalicia = market.pixProviders.find((p) => p.slug === 'banco-galicia');
    return {
      activePixProvider: defaultGalicia || null,
      activePixRate: defaultGalicia?.effectiveArsPerBrl ?? 300.42,
      activePixName: defaultGalicia?.prettyName ?? 'Banco Galicia (MODO)',
    };
  }, [
    cotacaoArqNumeric,
    market.arqLiveRate,
    market.pixProviders,
    selectedPixSlug,
    userState.isArqManual,
  ]);

  const valorBrlNumeric = useMemo(
    () => parseFlexibleDecimal(userState.purchaseBrlInput),
    [userState.purchaseBrlInput]
  );

  const valorUsdNumeric = useMemo(
    () => parseFlexibleDecimal(userState.usdAmountInput || '20'),
    [userState.usdAmountInput]
  );

  const dualQuotes = useMemo(
    () =>
      calculateDualCardQuotes({
        cotacaoArq: activePixRate,
        dolarOficial: activeOficialRate,
        liveSpotUsdBrl: market.spotUsdBrl.bid,
        config: userState.config,
      }),
    [activeOficialRate, activePixRate, market.spotUsdBrl.bid, userState.config]
  );

  const simulation = useMemo(
    () =>
      simulateRealPurchase({
        valorBrl: valorBrlNumeric,
        cotacaoArq: activePixRate,
        dolarOficialBanco: activeOficialRate,
        usdBrlBandeira: dualQuotes.usdBrlBandeira,
        metodoACotacaoEstimada: dualQuotes.metodoACotacaoEstimada,
      }),
    [
      activeOficialRate,
      activePixRate,
      dualQuotes.metodoACotacaoEstimada,
      dualQuotes.usdBrlBandeira,
      valorBrlNumeric,
    ]
  );

  const effectiveBrlForAlerts = useMemo(() => {
    if (inputCurrency === 'USD') {
      return valorUsdNumeric * dualQuotes.usdBrlComercialSpot;
    }
    return valorBrlNumeric;
  }, [dualQuotes.usdBrlComercialSpot, inputCurrency, valorBrlNumeric, valorUsdNumeric]);

  const modalDolaresFatura = useMemo(() => {
    if (inputCurrency === 'USD') {
      return roundUp2Decimals(valorUsdNumeric);
    }
    return simulation.dolaresFatura;
  }, [inputCurrency, simulation.dolaresFatura, valorUsdNumeric]);

  const modalTotalArs = useMemo(() => {
    if (paymentMode === 'pix') {
      return effectiveBrlForAlerts * activePixRate;
    }
    if (inputCurrency === 'USD') {
      return modalDolaresFatura * activeOficialRate;
    }
    return simulation.custoTotalCartaoArs;
  }, [
    activeOficialRate,
    activePixRate,
    effectiveBrlForAlerts,
    inputCurrency,
    modalDolaresFatura,
    paymentMode,
    simulation.custoTotalCartaoArs,
  ]);

  const effectiveSavingsArs = useMemo(() => {
    if (inputCurrency === 'USD') {
      return effectiveBrlForAlerts * activePixRate - modalDolaresFatura * activeOficialRate;
    }
    return simulation.economiaTotalArs;
  }, [
    activeOficialRate,
    activePixRate,
    effectiveBrlForAlerts,
    inputCurrency,
    modalDolaresFatura,
    simulation.economiaTotalArs,
  ]);

  const davidFeedback = useMemo(
    () =>
      getDavidSpendingFeedback(
        effectiveBrlForAlerts,
        effectiveSavingsArs,
        userState.config.davidGuardEnabled,
        inlinePhraseSeed
      ),
    [
      effectiveBrlForAlerts,
      effectiveSavingsArs,
      inlinePhraseSeed,
      userState.config.davidGuardEnabled,
    ]
  );

  // Dispara automaticamente o pop-up moderno 3D quando o gasto passa de R$ 400
  useEffect(() => {
    if (!userState.config.davidGuardEnabled || inputCurrency === 'ARS') {
      return;
    }

    if (effectiveBrlForAlerts < HIGH_SPEND_MODAL_THRESHOLD_BRL) {
      lastAlertedAmountRef.current = null;
      return;
    }

    const roundedKey = Math.round(effectiveBrlForAlerts * 100) / 100;
    if (lastAlertedAmountRef.current === roundedKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastAlertedAmountRef.current = roundedKey;
      setDavidModalVariant((v) => v + 1);
      setIsDavidModalOpen(true);
    }, 480);

    return () => window.clearTimeout(timer);
  }, [
    effectiveBrlForAlerts,
    inputCurrency,
    userState.config.davidGuardEnabled,
  ]);

  const pixSourceLabel = useMemo(() => {
    if (
      market.pixSource === 'comparapix-direct' ||
      market.pixSource === 'comparapix-proxy' ||
      market.pixSource === 'comparapix-cors'
    ) {
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
      paymentMode: 'card',
      inputCurrency: 'BRL',
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
    const defaultBank = resolveDefaultBankSlug(market);
    setUserState((prev) => ({
      ...prev,
      paymentMode: 'card',
      inputCurrency: 'BRL',
      converterDirection: 'BRL_TO_ARS',
      arqRateInput: formatArs(liveArq),
      isArqManual: false,
      selectedBankSlug: DEFAULT_CONFIG.defaultBankSlug || defaultBank,
      selectedPixSlug: DEFAULT_CONFIG.defaultPixSlug || 'banco-galicia',
      purchaseBrlInput: '100',
      usdAmountInput: '20',
      arsBudgetInput: '30000',
      config: {
        ...DEFAULT_CONFIG,
        davidGuardEnabled: prev.config.davidGuardEnabled,
      },
    }));
    showToast('⚡ Padrão Ualá + Banco Galicia (ao vivo) restaurado!');
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
      lastAlertedAmountRef.current = Math.round(numeric * 100) / 100;
      setDavidModalVariant((v) => v + 1);
      setIsDavidModalOpen(true);
    }
  };

  const handleUsdAmountChange = (val: string, isInstantPreset = false) => {
    setUserState((prev) => ({
      ...prev,
      usdAmountInput: val,
    }));

    const numericUsd = parseFlexibleDecimal(val);
    const equivBrl = numericUsd * dualQuotes.usdBrlComercialSpot;
    if (
      isInstantPreset &&
      userState.config.davidGuardEnabled &&
      equivBrl >= HIGH_SPEND_MODAL_THRESHOLD_BRL
    ) {
      lastAlertedAmountRef.current = Math.round(equivBrl * 100) / 100;
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
        <SmartConverterHero
          paymentMode={paymentMode}
          inputCurrency={inputCurrency}
          purchaseBrlInput={userState.purchaseBrlInput}
          usdAmountInput={userState.usdAmountInput || '20'}
          arsBudgetInput={userState.arsBudgetInput || '30000'}
          arqRateInput={userState.arqRateInput}
          isArqManual={userState.isArqManual}
          cotacaoArqNumeric={cotacaoArqNumeric}
          oficialBanks={market.oficialBanks}
          pixProviders={market.pixProviders}
          selectedBankSlug={userState.selectedBankSlug}
          selectedPixSlug={selectedPixSlug}
          manualOficialInput={userState.manualOficialInput}
          activeOficialRate={activeOficialRate}
          activeBankName={activeBankName}
          activePixProvider={activePixProvider}
          activePixRate={activePixRate}
          activePixName={activePixName}
          cardSpreadPct={userState.config.cardSpread * 100}
          quotes={dualQuotes}
          simulation={simulation}
          davidFeedback={davidFeedback}
          onChangePaymentMode={(mode) =>
            setUserState((prev) => ({
              ...prev,
              paymentMode: mode,
            }))
          }
          onChangeInputCurrency={(currency) =>
            setUserState((prev) => ({
              ...prev,
              inputCurrency: currency,
              converterDirection: currency === 'ARS' ? 'ARS_TO_BRL' : 'BRL_TO_ARS',
            }))
          }
          onPurchaseBrlChange={handlePurchaseBrlChange}
          onUsdAmountChange={handleUsdAmountChange}
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
            const galiciaProvider =
              market.pixProviders.find((p) => p.slug === 'banco-galicia') ||
              market.pixProviders[0];
            const liveRate = galiciaProvider?.effectiveArsPerBrl ?? 300.42;
            if (!liveRate) return;
            setUserState((prev) => ({
              ...prev,
              selectedPixSlug: 'banco-galicia',
              arqRateInput: formatArs(liveRate),
              isArqManual: false,
            }));
            showToast(`Cotação Banco Galicia (MODO) ao vivo restaurada: $${formatArs(liveRate)}`);
          }}
          onSelectBank={(slug) =>
            setUserState((prev) => ({
              ...prev,
              selectedBankSlug: slug,
            }))
          }
          onSelectPixProvider={(slug) => {
            const chosen = market.pixProviders.find((p) => p.slug === slug);
            setUserState((prev) => ({
              ...prev,
              selectedPixSlug: slug,
              arqRateInput:
                chosen?.effectiveArsPerBrl && chosen.effectiveArsPerBrl > 0
                  ? formatArs(chosen.effectiveArsPerBrl)
                  : prev.arqRateInput,
              isArqManual: false,
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
          selectedPixSlug={selectedPixSlug}
          onSelectPixRateForHero={(slug, rate, providerName) => {
            setUserState((prev) => ({
              ...prev,
              paymentMode: 'pix',
              selectedPixSlug: slug,
              arqRateInput: formatArs(rate),
              isArqManual: false,
            }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showToast(`Modo Transferência Pix: ${providerName} ($${formatArs(rate)})`);
          }}
          onSelectOficialBank={(slug, bankName, ask) => {
            setUserState((prev) => ({
              ...prev,
              paymentMode: 'card',
              selectedBankSlug: slug,
            }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showToast(
              `Cartão atualizado: dólar ${bankName} ($${formatArs(ask, ask % 1 === 0 ? 0 : 2)})`
            );
          }}
        />

        <footer className="pt-2 pb-4 text-center text-[11px] text-[var(--text-muted)] space-y-1">
          <p>
            Cotações atualizadas automaticamente a cada 25s via{' '}
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
        valorBrl={effectiveBrlForAlerts}
        custoTotalArs={modalTotalArs}
        dolaresFatura={modalDolaresFatura}
        variantIndex={davidModalVariant}
        onAccept={() => setIsDavidModalOpen(false)}
        onLowerToSafeAmount={() => {
          lastAlertedAmountRef.current = null;
          setIsDavidModalOpen(false);
          setUserState((prev) =>
            (prev.inputCurrency || 'BRL') === 'USD'
              ? { ...prev, usdAmountInput: '20' }
              : { ...prev, purchaseBrlInput: '100' }
          );
          showToast(
            inputCurrency === 'USD'
              ? '👏 Aí sim, David! Voltou pros US$ 20 — orgulho de você!'
              : '👏 Aí sim, David! Voltou pros R$ 100 — orgulho de você!'
          );
        }}
        onNextVariant={() => setDavidModalVariant((v) => v + 1)}
      />

      <SettingsDialog
        isOpen={isSettingsOpen}
        config={userState.config}
        liveSpotUsdBrl={market.spotUsdBrl.bid}
        themePreference={themePref}
        systemTheme={systemTheme}
        oficialBanks={market.oficialBanks}
        pixProviders={market.pixProviders}
        onChangeThemePreference={handleExplicitThemeChange}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateConfig={(next: CalculatorConfig) => {
          setUserState((prev) => {
            const bankChanged =
              next.defaultBankSlug !== prev.config.defaultBankSlug;
            const pixChanged = next.defaultPixSlug !== prev.config.defaultPixSlug;
            return {
              ...prev,
              config: next,
              selectedBankSlug: bankChanged
                ? next.defaultBankSlug
                : prev.selectedBankSlug,
              selectedPixSlug: pixChanged
                ? next.defaultPixSlug
                : prev.selectedPixSlug,
            };
          });
        }}
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
