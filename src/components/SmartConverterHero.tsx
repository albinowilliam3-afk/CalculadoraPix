import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CreditCard,
  Dices,
  Pointer,
  Sparkles,
} from 'lucide-react';
import type {
  DavidSpendingFeedback,
  DualCardQuoteResult,
  PurchaseSimulationResult,
} from '../lib/calculator';
import { EMPIRICAL_EUR_TO_USD_CARD_RATE, roundUp2Decimals } from '../lib/calculator';
import {
  formatArs,
  formatBrl,
  formatPct,
  formatUsd,
  parseFlexibleDecimal,
} from '../lib/formatters';
import type {
  InputCurrencyMode,
  PaymentMode,
  PixProviderNormalized,
  UsdProviderQuote,
} from '../types/finance';
import { ProviderAvatar } from './ProviderAvatar';

interface SmartConverterHeroProps {
  paymentMode: PaymentMode;
  inputCurrency: InputCurrencyMode;
  purchaseBrlInput: string;
  usdAmountInput: string;
  eurAmountInput: string;
  arsBudgetInput: string;
  arqRateInput?: string;
  isArqManual: boolean;
  cotacaoArqNumeric: number;
  oficialBanks: UsdProviderQuote[];
  pixProviders: PixProviderNormalized[];
  selectedBankSlug: string | 'manual';
  selectedPixSlug: string;
  manualOficialInput?: string;
  activeOficialRate: number;
  activeBankName: string;
  activePixProvider: PixProviderNormalized | null;
  activePixRate: number;
  activePixName: string;
  cardSpreadPct: number;
  quotes: DualCardQuoteResult;
  simulation: PurchaseSimulationResult;
  davidFeedback: DavidSpendingFeedback | null;
  onChangePaymentMode: (mode: PaymentMode) => void;
  onChangeInputCurrency: (currency: InputCurrencyMode) => void;
  onPurchaseBrlChange: (val: string, isInstantPreset?: boolean) => void;
  onUsdAmountChange: (val: string, isInstantPreset?: boolean) => void;
  onEurAmountChange: (val: string, isInstantPreset?: boolean) => void;
  onArsBudgetChange: (val: string) => void;
  onArqInputChange?: (val: string) => void;
  onResetArqToLive?: () => void;
  onSelectBank: (slug: string | 'manual') => void;
  onSelectPixProvider: (slug: string) => void;
  onManualOficialChange?: (val: string) => void;
  onCycleInlinePhrase: () => void;
  onOpenHighSpendModal: () => void;
}

interface AmountPreset {
  label: string;
  value: string;
  title?: string;
}

const BRL_PRESETS: AmountPreset[] = [
  { label: 'R$ 25', value: '25' },
  { label: 'R$ 50', value: '50' },
  { label: 'R$ 100', value: '100' },
  { label: 'R$ 250', value: '250' },
  { label: 'R$ 400', value: '400' },
  { label: 'R$ 500', value: '500' },
  { label: 'R$ 1.000', value: '1000' },
];

const USD_PRESETS: AmountPreset[] = [
  { label: 'US$ 10', value: '10' },
  { label: 'US$ 20', value: '20' },
  { label: 'US$ 50', value: '50' },
  { label: 'US$ 100', value: '100' },
  { label: 'US$ 200', value: '200' },
];

const EUR_PRESETS: AmountPreset[] = [
  { label: '€ 10', value: '10' },
  { label: '€ 20', value: '20' },
  { label: '€ 31,45', value: '31,45', title: 'Compra calibrada no cartão' },
  { label: '€ 50', value: '50' },
  { label: '€ 100', value: '100' },
];

const ARS_PRESETS: AmountPreset[] = [
  { label: '$ 10.000', value: '10000' },
  { label: '$ 30.000', value: '30000' },
  { label: '$ 50.000', value: '50000' },
  { label: '$ 100.000', value: '100000' },
  { label: '$ 250.000', value: '250000' },
];

function splitFormattedCurrency(formatted: string): { intPart: string; decPart: string } {
  const commaIdx = formatted.lastIndexOf(',');
  if (commaIdx === -1) return { intPart: formatted, decPart: '' };
  return {
    intPart: formatted.slice(0, commaIdx),
    decPart: formatted.slice(commaIdx),
  };
}

export const SmartConverterHero: React.FC<SmartConverterHeroProps> = ({
  paymentMode,
  inputCurrency,
  purchaseBrlInput,
  usdAmountInput,
  eurAmountInput,
  arsBudgetInput,
  isArqManual,
  oficialBanks,
  pixProviders,
  selectedBankSlug,
  selectedPixSlug,
  activeOficialRate,
  activeBankName,
  activePixProvider,
  activePixRate,
  activePixName,
  cardSpreadPct,
  quotes,
  simulation,
  davidFeedback,
  onChangePaymentMode,
  onChangeInputCurrency,
  onPurchaseBrlChange,
  onUsdAmountChange,
  onEurAmountChange,
  onArsBudgetChange,
  onSelectBank,
  onSelectPixProvider,
  onCycleInlinePhrase,
  onOpenHighSpendModal,
}) => {
  const [showCardDetails, setShowCardDetails] = useState(false);
  const cardHeadingRef = useRef<HTMLDivElement>(null);

  const isCardMode = paymentMode === 'card';
  const isArsInput = inputCurrency === 'ARS';
  const isUsdInput = inputCurrency === 'USD';
  const isEurInput = inputCurrency === 'EUR';

  const activeCardBank =
    selectedBankSlug === 'manual'
      ? null
      : oficialBanks.find((b) => b.slug === selectedBankSlug) ||
        oficialBanks.find((b) => b.slug === 'uala') ||
        oficialBanks[0] ||
        null;

  const switchPaymentModeSmooth = (nextMode: PaymentMode) => {
    if (nextMode === paymentMode) return;

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (!docWithVT.startViewTransition) {
      onChangePaymentMode(nextMode);
      requestAnimationFrame(() => {
        cardHeadingRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    const transition = docWithVT.startViewTransition(() => {
      flushSync(() => {
        onChangePaymentMode(nextMode);
      });
    });

    transition.finished.finally(() => {
      cardHeadingRef.current?.focus({ preventScroll: true });
    });
  };

  // Cálculos conforme a moeda digitada (BRL, USD, EUR ou ARS)
  const usdNumeric = parseFlexibleDecimal(usdAmountInput);
  const eurNumeric = parseFlexibleDecimal(eurAmountInput);
  const arsNumeric = parseFlexibleDecimal(arsBudgetInput);

  // Quantidade de dólares na fatura (em BRL usa simulação exata; em USD usa o valor digitado; em EUR converte pela taxa calibrada da bandeira)
  const effectiveDolaresFatura = isUsdInput
    ? roundUp2Decimals(usdNumeric)
    : isEurInput
      ? roundUp2Decimals(eurNumeric * EMPIRICAL_EUR_TO_USD_CARD_RATE)
      : simulation.dolaresFatura;

  // Valor equivalente em BRL para calcular o custo nas carteiras Pix
  const effectiveBrlForPix = isUsdInput
    ? usdNumeric * quotes.usdBrlComercialSpot
    : isEurInput
      ? effectiveDolaresFatura * quotes.usdBrlComercialSpot
      : simulation.valorBrl;

  // Totais principais em Pesos (quando comprando em BRL, USD ou EUR)
  const totalCardArs = (isUsdInput || isEurInput)
    ? effectiveDolaresFatura * activeOficialRate
    : simulation.custoTotalCartaoArs;

  const totalPixArs = effectiveBrlForPix * activePixRate;

  // Diferença absoluta e percentual em Pesos entre Cartão e Pix
  const diffArsAbs = Math.abs(totalCardArs - totalPixArs);
  const baseArs = Math.min(totalCardArs, totalPixArs);
  const diffPctArs = baseArs > 0 ? (diffArsAbs / baseArs) * 100 : 0;

  // Totais reversos em Reais (quando digitando orçamento em Pesos ARS)
  const reverseBrlOnCard =
    quotes.cardReferenceRate > 0 ? arsNumeric / quotes.cardReferenceRate : 0;
  const reverseBrlOnPix = activePixRate > 0 ? arsNumeric / activePixRate : 0;
  const reverseUsdOnCard = activeOficialRate > 0 ? arsNumeric / activeOficialRate : 0;
  const reverseDiffBrl = reverseBrlOnCard - reverseBrlOnPix;
  const baseReverseBrl = Math.max(reverseBrlOnCard, reverseBrlOnPix);
  const reverseDiffPct =
    baseReverseBrl > 0 ? (Math.abs(reverseDiffBrl) / baseReverseBrl) * 100 : 0;

  // Comparação de vantagem (Economiza vs Perde):
  // Se input em Pesos (ARS): gasta MENOS Reais quem tem menor reverseBrl (vantagem para quem gasta menos)
  // Se input em Reais (BRL), Dólar (USD) ou Euro (EUR): rende MAIS Pesos quem tem maior totalArs (vantagem para quem entrega mais)
  const cardSaves = isArsInput
    ? reverseBrlOnCard <= reverseBrlOnPix
    : totalCardArs >= totalPixArs;
  const pixSaves = isArsInput
    ? reverseBrlOnPix < reverseBrlOnCard
    : totalPixArs > totalCardArs;

  // Número principal exibido gigante dentro do cartão (Roxo ou Verde)
  const primaryDisplayFormatted = isArsInput
    ? formatBrl(isCardMode ? reverseBrlOnCard : reverseBrlOnPix)
    : formatArs(isCardMode ? totalCardArs : totalPixArs, 2);

  const { intPart: mainInt, decPart: mainDec } = splitFormattedCurrency(
    primaryDisplayFormatted
  );

  // Construção das Top 5 melhores cotações para o scroll compacto
  // 1) Modo Cartão: Top 5 bancos de Dólar Oficial (garantindo Ualá sempre visível na lista)
  const top5CardBanks = React.useMemo(() => {
    const topFive = oficialBanks.slice(0, 5);
    const hasUala = topFive.some((b) => b.slug === 'uala');
    const ualaItem = !hasUala ? oficialBanks.find((b) => b.slug === 'uala') : undefined;
    const hasSelected =
      selectedBankSlug !== 'manual' &&
      topFive.some((b) => b.slug === selectedBankSlug);
    const selectedItem =
      !hasSelected && selectedBankSlug !== 'manual' && selectedBankSlug !== 'uala'
        ? oficialBanks.find((b) => b.slug === selectedBankSlug)
        : undefined;

    const combined = [...topFive];
    if (ualaItem) combined.push(ualaItem);
    if (selectedItem) combined.push(selectedItem);
    return combined;
  }, [oficialBanks, selectedBankSlug]);

  // 2) Modo Pix: Top 5 carteiras Pix (garantindo ARQ, Credicoop e Galicia sempre visíveis)
  const top5PixWallets = React.useMemo(() => {
    const walletsOnly = pixProviders.filter(
      (p) =>
        p.estimationBasis !== 'Oficial CBU' ||
        p.slug === 'banco-credicoop' ||
        p.slug === 'banco-galicia'
    );
    const sourceList = walletsOnly.length > 0 ? walletsOnly : pixProviders;
    const topFive = sourceList.slice(0, 5);

    const hasCredicoop = topFive.some((p) => p.slug === 'banco-credicoop');
    const credicoopItem = !hasCredicoop
      ? sourceList.find((p) => p.slug === 'banco-credicoop')
      : undefined;

    const hasGalicia = topFive.some((p) => p.slug === 'banco-galicia');
    const galiciaItem = !hasGalicia
      ? sourceList.find((p) => p.slug === 'banco-galicia')
      : undefined;

    const hasArq = topFive.some((p) => p.slug === 'arq');
    const arqItem = !hasArq ? sourceList.find((p) => p.slug === 'arq') : undefined;

    const hasSelected = topFive.some((p) => p.slug === selectedPixSlug);
    const selectedItem =
      !hasSelected &&
      selectedPixSlug !== 'arq' &&
      selectedPixSlug !== 'banco-credicoop' &&
      selectedPixSlug !== 'banco-galicia'
        ? sourceList.find((p) => p.slug === selectedPixSlug)
        : undefined;

    const combined = [...topFive];
    if (galiciaItem && !combined.some((p) => p.slug === galiciaItem.slug)) {
      combined.push(galiciaItem);
    }
    if (credicoopItem && !combined.some((p) => p.slug === credicoopItem.slug)) {
      combined.push(credicoopItem);
    }
    if (arqItem && !combined.some((p) => p.slug === arqItem.slug)) {
      combined.push(arqItem);
    }
    if (selectedItem && !combined.some((p) => p.slug === selectedItem.slug)) {
      combined.push(selectedItem);
    }
    return combined;
  }, [pixProviders, selectedPixSlug]);

  const currentInputValue =
    inputCurrency === 'BRL'
      ? purchaseBrlInput
      : inputCurrency === 'USD'
        ? usdAmountInput
        : inputCurrency === 'EUR'
          ? eurAmountInput
          : arsBudgetInput;

  const activePresets =
    inputCurrency === 'BRL'
      ? BRL_PRESETS
      : inputCurrency === 'USD'
        ? USD_PRESETS
        : inputCurrency === 'EUR'
          ? EUR_PRESETS
          : ARS_PRESETS;

  const davidBannerStyles: Record<DavidSpendingFeedback['level'], string> = {
    benchmark: 'bg-[#5664F5]/10 border-[#5664F5]/25',
    calm: 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]',
    watch: 'bg-amber-500/10 border-amber-500/25',
    warning: 'bg-orange-500/12 border-orange-500/30',
    critical: 'bg-rose-500/12 border-rose-500/35',
  };

  return (
    <section
      id="simulador"
      aria-label="Conversor Inteligente PesoPix"
      className="space-y-4"
    >
      <div className="bank-surface rounded-[28px] p-4 sm:p-5">
        {/* =================================================================
            PASSO 1: VALOR E MOEDA (SUPER INTUITIVO PRO DAVID!)
            ================================================================= */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="main-amount-input"
              className="text-xs font-extrabold text-[var(--text-secondary)]"
            >
              {inputCurrency === 'BRL'
                ? 'Quanto custa em Reais?'
                : inputCurrency === 'USD'
                  ? 'Quanto custa em Dólar?'
                  : inputCurrency === 'EUR'
                    ? 'Quanto custa em Euro?'
                    : 'Quantos Pesos você tem?'}
            </label>

            {/* Seletor simples de moeda sem siglas confusas */}
            <div
              role="group"
              aria-label="Escolher moeda digitada"
              className="bank-subtle inline-flex items-center gap-0.5 rounded-full p-0.5"
            >
              {(
                [
                  { id: 'BRL', label: 'R$ Reais' },
                  { id: 'USD', label: 'US$ Dólar' },
                  { id: 'EUR', label: '€ Euro' },
                  { id: 'ARS', label: '$ Pesos' },
                ] as const
              ).map((curr) => {
                const active = inputCurrency === curr.id;
                return (
                  <button
                    key={curr.id}
                    type="button"
                    onClick={() => onChangeInputCurrency(curr.id)}
                    aria-pressed={active}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition active:scale-95 ${
                      active
                        ? 'bg-[var(--bg-card)] text-[var(--brand-primary)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {curr.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bank-input flex items-center rounded-2xl px-4 py-3 transition">
            <span
              className={`mr-2 select-none text-xl font-extrabold ${
                isCardMode ? 'text-[var(--brand-primary)]' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {inputCurrency === 'BRL'
                ? 'R$'
                : inputCurrency === 'USD'
                  ? 'US$'
                  : inputCurrency === 'EUR'
                    ? '€'
                    : '$'}
            </span>
            <input
              id="main-amount-input"
              name="mainAmount"
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={currentInputValue}
              onChange={(e) => {
                const v = e.target.value;
                if (inputCurrency === 'BRL') onPurchaseBrlChange(v, false);
                else if (inputCurrency === 'USD') onUsdAmountChange(v, false);
                else if (inputCurrency === 'EUR') onEurAmountChange(v, false);
                else onArsBudgetChange(v);
              }}
              placeholder={
                inputCurrency === 'BRL'
                  ? '100'
                  : inputCurrency === 'USD'
                    ? '20'
                    : inputCurrency === 'EUR'
                      ? '31,45'
                      : '30000'
              }
              className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <span className="bank-subtle ml-2 shrink-0 select-none rounded-xl px-2.5 py-1 text-xs font-extrabold text-[var(--text-primary)]">
              {inputCurrency}
            </span>
          </div>

          {/* Atalhos Rápidos de Valor (1 toque) */}
          <div className="no-scrollbar -mx-1 mt-2.5 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
            {activePresets.map((preset) => {
              const isActive =
                currentInputValue.replace('.', ',') === preset.value.replace('.', ',');
              return (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.title}
                  onClick={() => {
                    if (inputCurrency === 'BRL') onPurchaseBrlChange(preset.value, true);
                    else if (inputCurrency === 'USD') onUsdAmountChange(preset.value, true);
                    else if (inputCurrency === 'EUR') onEurAmountChange(preset.value, true);
                    else onArsBudgetChange(preset.value);
                  }}
                  className={`min-h-[36px] shrink-0 rounded-xl px-3 py-1 text-xs font-bold transition active:scale-95 ${
                    isActive
                      ? isCardMode
                        ? 'bg-[#5664F5] text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : 'bank-subtle text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================================
            PASSO 2: BOTÃO DE TROCA SUAVE — CARTÃO DE CRÉDITO vs PIX
            ================================================================= */}
        <div className="mt-4">
          <div
            role="tablist"
            aria-label="Escolher forma de pagamento"
            className="grid grid-cols-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-1"
          >
            <button
              role="tab"
              type="button"
              aria-selected={isCardMode}
              onClick={() => switchPaymentModeSmooth('card')}
              className="relative flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition"
            >
              {isCardMode && (
                <span className="active-payment-card-pill absolute inset-0 rounded-xl shadow-md shadow-indigo-500/25" />
              )}
              <CreditCard
                className={`relative z-10 h-4 w-4 ${
                  isCardMode ? 'text-white' : 'text-[var(--text-muted)]'
                }`}
              />
              <span
                className={`relative z-10 ${
                  isCardMode ? 'text-white' : 'text-[var(--text-secondary)]'
                }`}
              >
                Cartão de Crédito
              </span>
            </button>

            <button
              role="tab"
              type="button"
              aria-selected={!isCardMode}
              onClick={() => switchPaymentModeSmooth('pix')}
              className="relative flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition"
            >
              {!isCardMode && (
                <span className="active-payment-pix-pill absolute inset-0 rounded-xl shadow-md shadow-emerald-500/25" />
              )}
              <PixDiamondIcon
                className={`relative z-10 h-4 w-4 ${
                  !isCardMode ? 'text-white' : 'text-[var(--text-muted)]'
                }`}
              />
              <span
                className={`relative z-10 ${
                  !isCardMode ? 'text-white' : 'text-[var(--text-secondary)]'
                }`}
              >
                Transferência Pix
              </span>
            </button>
          </div>
        </div>

        {/* =================================================================
            CARTÃO VIRTUAL DINÂMICO:
            - ROXO no modo Cartão de Crédito: "No cartão de crédito - (dólar Ualá)"
            - VERDE no modo Transferência Pix: "Transferência Pix - ARQ (DolarApp)"
            ================================================================= */}
        <div
          key={paymentMode}
          ref={cardHeadingRef}
          tabIndex={-1}
          className={`card-mode-swap mt-3.5 rounded-[24px] p-5 focus:outline-none ${
            isCardMode ? 'neobank-virtual-card' : 'neobank-pix-card'
          }`}
        >
          {/* Cabeçalho do Cartão / Pix */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                {isCardMode ? (
                  activeCardBank?.logoUrl ? (
                    <ProviderAvatar
                      src={activeCardBank.logoUrl}
                      name={activeBankName}
                      sizeClass="h-4 w-4"
                    />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5 text-white" />
                  )
                ) : activePixProvider ? (
                  <ProviderAvatar
                    src={activePixProvider.logo}
                    name={activePixName}
                    sizeClass="h-4 w-4"
                  />
                ) : (
                  <PixDiamondIcon className="h-3.5 w-3.5 text-white" />
                )}
              </span>

              <span className="truncate text-xs sm:text-[13px] font-extrabold text-white">
                {isCardMode
                  ? `Cartão de Crédito - ${activeBankName}`
                  : `Transferência Pix - ${activePixName}`}
              </span>
            </div>

            {isCardMode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shrink-0">
                <CreditCard className="h-3 w-3 text-white" />
                Cartão
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shrink-0">
                <PixDiamondIcon className="h-3 w-3 text-white" />
                Pix
              </span>
            )}
          </div>

          {/* VALOR PRINCIPAL GIGANTE EM PESOS (OU REAIS SE DIGITOU PESOS) */}
          <div className="relative z-10 mt-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
              {isArsInput
                ? 'Você consegue gastar no Brasil'
                : 'Você vai pagar em Pesos'}
            </div>

            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline tabular-nums">
                <span className="mr-1.5 text-xl sm:text-2xl font-bold text-white/85">
                  {isArsInput ? 'R$' : '$'}
                </span>
                <span className="text-4xl sm:text-[42px] font-extrabold leading-none tracking-tight text-white">
                  {mainInt}
                </span>
                <span className="text-lg sm:text-xl font-bold text-white/80">
                  {mainDec}
                </span>
                <span className="ml-2 text-xs font-bold uppercase text-white/80">
                  {isArsInput ? 'BRL' : 'ARS'}
                </span>
              </div>

              {/* Pill secundária clara (Fatura USD no Cartão ou Cotação por R$ 1 no Pix) */}
              <span className="rounded-xl bg-white/18 px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur-sm tabular-nums">
                {isCardMode
                  ? `Fatura: US$ ${formatUsd(
                      isArsInput ? reverseUsdOnCard : effectiveDolaresFatura
                    )}`
                  : `$ ${formatArs(activePixRate)} / R$ 1`}
              </span>
            </div>
          </div>

          {/* Barra Comparativa Direta em Linguagem Simples (Cartão vs Pix) */}
          <div className="relative z-10 mt-4 flex items-center justify-between gap-2 rounded-2xl bg-black/18 px-3.5 py-2.5 border border-white/15 backdrop-blur-md text-xs">
            {isCardMode ? (
              <>
                <div className="min-w-0 truncate text-white/90 tabular-nums">
                  <span>
                    No Pix ({activePixName.replace(/\s*\(manual\)\)?/gi, '').replace(/\s*\(MODO\)\)?/gi, '').replace('ARQ (DolarApp)', 'ARQ')}):{' '}
                  </span>
                  <strong className="font-extrabold text-white">
                    {isArsInput
                      ? `R$ ${formatBrl(reverseBrlOnPix)}`
                      : `$ ${formatArs(totalPixArs, 0)} ARS`}
                  </strong>
                </div>

                <div
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-extrabold tabular-nums shadow-sm transition animate-pulse ${
                    cardSaves
                      ? 'bg-emerald-500/80 text-white border border-emerald-300/40'
                      : 'bg-rose-500/85 text-white border border-rose-300/50'
                  }`}
                >
                  {isArsInput ? (
                    cardSaves ? (
                      <>Cartão economiza R$ {formatBrl(Math.abs(reverseDiffBrl))} (-{formatPct(reverseDiffPct, 1)})</>
                    ) : (
                      <>Cartão perde R$ {formatBrl(Math.abs(reverseDiffBrl))} (+{formatPct(reverseDiffPct, 1)})</>
                    )
                  ) : cardSaves ? (
                    <>
                      Cartão economiza $ {formatArs(diffArsAbs, 0)} (-{formatPct(diffPctArs, 1)})
                    </>
                  ) : (
                    <>
                      Cartão perde $ {formatArs(diffArsAbs, 0)} (+{formatPct(diffPctArs, 1)})
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0 truncate text-white/90 tabular-nums">
                  <span>No cartão ({activeBankName.replace(/\s*\(manual\)\)?/gi, '')}): </span>
                  <strong className="font-extrabold text-white">
                    {isArsInput
                      ? `R$ ${formatBrl(reverseBrlOnCard)}`
                      : `$ ${formatArs(totalCardArs, 0)} ARS`}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => switchPaymentModeSmooth('card')}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-extrabold tabular-nums shadow-sm transition active:scale-95 animate-pulse ${
                    pixSaves
                      ? 'bg-emerald-500/80 text-white border border-emerald-300/40'
                      : 'bg-rose-500/85 text-white border border-rose-300/50'
                  }`}
                >
                  {isArsInput ? (
                    pixSaves ? (
                      <>Pix economiza R$ {formatBrl(Math.abs(reverseDiffBrl))} (-{formatPct(reverseDiffPct, 1)})</>
                    ) : (
                      <>Pix perde R$ {formatBrl(Math.abs(reverseDiffBrl))} (+{formatPct(reverseDiffPct, 1)})</>
                    )
                  ) : pixSaves ? (
                    <>
                      Pix economiza $ {formatArs(diffArsAbs, 0)} (-{formatPct(diffPctArs, 1)})
                    </>
                  ) : (
                    <>
                      Pix perde $ {formatArs(diffArsAbs, 0)} (+{formatPct(diffPctArs, 1)})
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Detalhes técnicos recolhíveis para não confundir o David */}
          <button
            type="button"
            onClick={() => setShowCardDetails((prev) => !prev)}
            aria-expanded={showCardDetails}
            aria-controls="card-technical-details"
            className="relative z-10 mt-3 flex w-full items-center justify-between text-[11px] font-semibold text-white/85 hover:text-white transition"
          >
            <span className="tabular-nums">
              {isCardMode
                ? isEurInput
                  ? `Conversão Euro: € 1 = US$ 1,1345 (taxa bandeira) • Detalhes`
                  : `Cotação efetiva: $ ${formatArs(quotes.metodoBCotacaoContinua)} por R$ 1 • Como pagar sem imposto?`
                : `US$ 1 Comercial = R$ ${formatBrl(quotes.usdBrlComercialSpot)} • Ver detalhes`}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${
                showCardDetails ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showCardDetails && (
            <div
              id="card-technical-details"
              className="relative z-10 mt-2.5 space-y-2 rounded-2xl bg-black/22 p-3 text-[11px] leading-relaxed text-white/95 border border-white/15"
            >
              {isCardMode ? (
                <>
                  {isEurInput && (
                    <div className="rounded-xl bg-white/10 px-2.5 py-1.5 mb-2">
                      <div className="text-[10px] text-white/75 font-semibold">Conversão Euro na Fatura</div>
                      <div className="font-extrabold tabular-nums">
                        € {eurAmountInput || '31,45'} ➔ US$ {formatUsd(effectiveDolaresFatura)} (calibração real € 31,45 = US$ 35,68)
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white/10 px-2.5 py-1.5">
                      <div className="text-[10px] text-white/75">Spot + Oficial</div>
                      <div className="font-extrabold tabular-nums">
                        $ {formatArs(quotes.metodoBCotacaoContinua)} / R$ 1
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/10 px-2.5 py-1.5">
                      <div className="text-[10px] text-white/75">Fórmula -5,35%</div>
                      <div className="font-extrabold tabular-nums">
                        $ {formatArs(quotes.metodoACotacaoEstimada)} / R$ 1
                      </div>
                    </div>
                  </div>
                  <p>
                    💡 <strong>Dica pro David:</strong> passe o cartão na maquininha em{' '}
                    <strong>Reais (BRL)</strong> e pague a fatura usando os{' '}
                    <strong>dólares comprados no {activeBankName}</strong> (com{' '}
                    <em>Stop Debit</em>) para zerar os 30% de imposto (`-{formatPct(cardSpreadPct, 2)}` spread).
                  </p>
                </>
              ) : (
                <p>
                  ⚡ No <strong>Pix via {activePixName}</strong>, o valor em Pesos sai na
                  hora da sua conta sem precisar pagar fatura depois. Cotação atual:{' '}
                  <strong>$ {formatArs(activePixRate)} ARS</strong> por cada{' '}
                  <strong>R$ 1,00</strong>.
                </p>
              )}
            </div>
          )}
        </div>

        {/* =================================================================
            TOP 5 MELHORES COTAÇÕES (EM SCROLL COMPACTO PARA NÃO QUEBRAR PÁGINA!)
            - Em Cartão: mostra valor em Pesos nos Top 5 bancos (Ualá padrão)
            - Em Pix: mostra valor em Pesos nas Top 5 carteiras Pix (ARQ padrão)
            ================================================================= */}
        <div className="mt-4 pt-3.5 border-t border-[var(--border-subtle)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-extrabold text-[var(--text-primary)]">
                {isCardMode
                  ? 'Top 5 melhores cotações • Dólar do Cartão'
                  : 'Top 5 melhores cotações • Transferência Pix'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Toque para trocar • role para comparar o valor em {isArsInput ? 'Reais' : 'Pesos'}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-[#5664F5]/10 text-[var(--brand-primary)] select-none shadow-xs"
              title="Toque na lista para selecionar"
            >
              <Pointer className="h-4 w-4 -rotate-12" />
            </div>
          </div>

          {/* LISTA COM SCROLL COMPACTO (NÃO ESTICA NEM QUEBRA A PÁGINA!) */}
          <div
            role="listbox"
            aria-label={
              isCardMode
                ? 'Melhores bancos de Dólar Oficial'
                : 'Melhores carteiras de Transferência Pix'
            }
            className="compact-quotes-scroll max-h-[196px] space-y-1.5 overflow-y-auto pr-1"
          >
            {isCardMode
              ? top5CardBanks.map((bank) => {
                  const bankAsk = bank.ask || 0;
                  const isSelected = selectedBankSlug === bank.slug;
                  const rankInAll =
                    oficialBanks.findIndex((b) => b.slug === bank.slug) + 1;

                  const rowTotalArs = effectiveDolaresFatura * bankAsk;
                  const rowReverseBrl =
                    quotes.usdBrlBandeira > 0 && bankAsk > 0
                      ? (arsNumeric / bankAsk) * quotes.usdBrlBandeira
                      : 0;

                  return (
                    <button
                      key={bank.slug}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => onSelectBank(bank.slug)}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.99] ${
                        isSelected
                          ? 'bg-[#5664F5]/[0.10] border-[#5664F5]/45'
                          : 'bank-subtle border-transparent hover:opacity-95'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)] text-[10px] font-extrabold text-[var(--text-muted)] tabular-nums">
                          #{rankInAll > 0 ? rankInAll : '•'}
                        </span>

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)]">
                          <ProviderAvatar
                            src={bank.logoUrl}
                            name={bank.prettyName}
                            sizeClass="h-5 w-5"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate text-xs font-extrabold text-[var(--text-primary)]">
                              dólar {bank.prettyName}
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-[var(--text-muted)] tabular-nums">
                            Dólar Oficial: ${formatArs(bankAsk, 0)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right tabular-nums">
                          <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)]">
                            {isArsInput
                              ? `R$ ${formatBrl(rowReverseBrl)}`
                              : `$ ${formatArs(rowTotalArs, 0)} ARS`}
                          </div>
                          <div className="text-[10px] font-bold text-[var(--brand-primary)]">
                            {isSelected ? 'Em uso' : 'Usar'}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5664F5] text-white">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              : top5PixWallets.map((wallet) => {
                  const wRate = wallet.effectiveArsPerBrl || 0;
                  const isSelected = !isArqManual && selectedPixSlug === wallet.slug;
                  const walletsOnly = pixProviders.filter(
                    (p) => p.estimationBasis !== 'Oficial CBU'
                  );
                  const rankInPix =
                    (walletsOnly.length > 0 ? walletsOnly : pixProviders).findIndex(
                      (p) => p.slug === wallet.slug
                    ) + 1;

                  const rowTotalArs = effectiveBrlForPix * wRate;
                  const rowReverseBrl = wRate > 0 ? arsNumeric / wRate : 0;

                  return (
                    <button
                      key={wallet.slug}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => onSelectPixProvider(wallet.slug)}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-2xl border px-3 py-2 text-left transition active:scale-[0.99] ${
                        isSelected
                          ? 'bg-emerald-500/[0.11] border-emerald-500/45'
                          : 'bank-subtle border-transparent hover:opacity-95'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)] text-[10px] font-extrabold text-[var(--text-muted)] tabular-nums">
                          #{rankInPix > 0 ? rankInPix : '•'}
                        </span>

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-card)]">
                          <ProviderAvatar
                            src={wallet.logo}
                            name={wallet.prettyName}
                            sizeClass="h-5 w-5"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="truncate text-xs font-extrabold text-[var(--text-primary)]">
                              {wallet.prettyName}
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-[var(--text-muted)] tabular-nums">
                            Cotação: ${formatArs(wRate)} / R$ 1
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right tabular-nums">
                          <div className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)]">
                            {isArsInput
                              ? `R$ ${formatBrl(rowReverseBrl)}`
                              : `$ ${formatArs(rowTotalArs, 0)} ARS`}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {isSelected ? 'Em uso' : 'Usar'}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>

        {/* =================================================================
            RECADOS BEM-HUMORADOS DIRETO PRO DAVID
            ================================================================= */}
        {!isArsInput && davidFeedback && (
          <div
            className={`mt-3.5 rounded-2xl border px-3.5 py-2.5 transition-all ${davidBannerStyles[davidFeedback.level]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold leading-snug text-[var(--text-primary)]">
                  {davidFeedback.badge}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {davidFeedback.detail}
                </p>
              </div>

              {effectiveBrlForPix >= 400 ? (
                <button
                  type="button"
                  onClick={onOpenHighSpendModal}
                  className="bank-surface shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-rose-500 active:scale-95 transition"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Ver alerta</span>
                </button>
              ) : davidFeedback.level === 'benchmark' ? (
                <Sparkles className="h-4 w-4 shrink-0 text-[#5664F5] mt-0.5" />
              ) : (
                <button
                  type="button"
                  onClick={onCycleInlinePhrase}
                  title="Sortear outra frase para o David"
                  className="bank-surface shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition"
                >
                  <Dices className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                  <span>Outra</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/**
 * Ícone geométrico limpo no estilo do símbolo do Pix
 */
const PixDiamondIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.1"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M14.8 4.2a2.8 2.8 0 0 0-5.6 0l-5 5a2.8 2.8 0 0 0 0 5.6l5 5a2.8 2.8 0 0 0 5.6 0l5-5a2.8 2.8 0 0 0 0-5.6l-5-5Z" />
    <path d="M8.5 9.5 12 13l3.5-3.5" />
    <path d="M8.5 14.5 12 11l3.5 3.5" />
  </svg>
);
