import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  Dices,
  Edit3,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type {
  DavidSpendingFeedback,
  DualCardQuoteResult,
  PurchaseSimulationResult,
} from '../lib/calculator';
import {
  formatArs,
  formatBrl,
  formatPct,
  formatUsd,
  parseFlexibleDecimal,
} from '../lib/formatters';
import type { UsdProviderQuote } from '../types/finance';
import { ProviderAvatar } from './ProviderAvatar';

interface SmartConverterHeroProps {
  direction: 'BRL_TO_ARS' | 'ARS_TO_BRL';
  purchaseBrlInput: string;
  arsBudgetInput: string;
  arqRateInput: string;
  isArqManual: boolean;
  arqLiveRate: number | null;
  cotacaoArqNumeric: number;
  oficialBanks: UsdProviderQuote[];
  selectedBankSlug: string | 'manual';
  manualOficialInput: string;
  activeOficialRate: number;
  activeBankName: string;
  cardSpreadPct: number;
  quotes: DualCardQuoteResult;
  simulation: PurchaseSimulationResult;
  davidFeedback: DavidSpendingFeedback | null;
  onToggleDirection: () => void;
  onPurchaseBrlChange: (val: string, isInstantPreset?: boolean) => void;
  onArsBudgetChange: (val: string) => void;
  onArqInputChange: (val: string) => void;
  onResetArqToLive: () => void;
  onSelectBank: (slug: string | 'manual') => void;
  onManualOficialChange: (val: string) => void;
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
  { label: 'R$ 10,64 🎯', value: '10,64', title: 'Compra real de calibração' },
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
  direction,
  purchaseBrlInput,
  arsBudgetInput,
  arqRateInput,
  isArqManual,
  arqLiveRate,
  cotacaoArqNumeric,
  oficialBanks,
  selectedBankSlug,
  manualOficialInput,
  activeOficialRate,
  activeBankName,
  cardSpreadPct,
  quotes,
  simulation,
  davidFeedback,
  onToggleDirection,
  onPurchaseBrlChange,
  onArsBudgetChange,
  onArqInputChange,
  onResetArqToLive,
  onSelectBank,
  onManualOficialChange,
  onCycleInlinePhrase,
  onOpenHighSpendModal,
}) => {
  const [showStopDebitTip, setShowStopDebitTip] = useState(false);

  const isBrlToArs = direction === 'BRL_TO_ARS';

  // Cálculo reverso quando usuário inverte para ARS -> BRL
  const arsNumeric = parseFlexibleDecimal(arsBudgetInput);
  const reverseBrlCard =
    quotes.cardReferenceRate > 0 ? arsNumeric / quotes.cardReferenceRate : 0;
  const reverseBrlArq = cotacaoArqNumeric > 0 ? arsNumeric / cotacaoArqNumeric : 0;
  const reverseExtraBrl = reverseBrlCard - reverseBrlArq;
  const reverseUsdCard = activeOficialRate > 0 ? arsNumeric / activeOficialRate : 0;

  const formattedCardTotalArs = formatArs(simulation.custoTotalCartaoArs, 2);
  const { intPart: arsInt, decPart: arsDec } = splitFormattedCurrency(formattedCardTotalArs);

  const formattedReverseBrl = formatBrl(reverseBrlCard);
  const { intPart: brlInt, decPart: brlDec } = splitFormattedCurrency(formattedReverseBrl);

  const isSavingPositive = isBrlToArs
    ? simulation.economiaTotalArs >= 0
    : reverseExtraBrl >= 0;

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
      aria-label="Conversor Inteligente Reais e Pesos"
      className="space-y-4"
    >
      {/* =====================================================================
          1. CONVERSOR PRINCIPAL NO TOPO (INTUITIVO ESTILO APP DE BANCO)
             Digita R$ 100 -> vê na hora quanto paga em Pesos no Cartão!
          ===================================================================== */}
      <div className="bank-surface rounded-[28px] p-4 sm:p-5">
        {/* Bloco de Entrada: Valor em Reais (ou Pesos se invertido) */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              htmlFor="main-amount-input"
              className="text-xs font-bold text-[var(--text-secondary)]"
            >
              {isBrlToArs
                ? 'Quanto custa em Reais?'
                : 'Quantos Pesos você quer gastar?'}
            </label>

            <button
              type="button"
              onClick={onToggleDirection}
              className="bank-subtle inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)] transition active:scale-95"
              title="Inverter sentido da conversão (Reais ⇄ Pesos)"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span>{isBrlToArs ? 'BRL → ARS' : 'ARS → BRL'}</span>
            </button>
          </div>

          <div className="bank-input flex items-center rounded-2xl px-4 py-3 transition">
            <span className="mr-2 select-none text-xl font-extrabold text-[var(--brand-primary)]">
              {isBrlToArs ? 'R$' : '$'}
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
              value={isBrlToArs ? purchaseBrlInput : arsBudgetInput}
              onChange={(e) =>
                isBrlToArs
                  ? onPurchaseBrlChange(e.target.value)
                  : onArsBudgetChange(e.target.value)
              }
              placeholder={isBrlToArs ? '100' : '30000'}
              className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            <span className="bank-subtle ml-2 shrink-0 select-none rounded-xl px-2.5 py-1 text-xs font-extrabold text-[var(--text-primary)]">
              {isBrlToArs ? 'BRL' : 'ARS'}
            </span>
          </div>

          {/* Atalhos Rápidos de Valor (1 toque) */}
          <div className="no-scrollbar -mx-1 mt-2.5 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
            {(isBrlToArs ? BRL_PRESETS : ARS_PRESETS).map((preset) => {
              const currentRaw = isBrlToArs ? purchaseBrlInput : arsBudgetInput;
              const isActive =
                currentRaw.replace('.', ',') === preset.value.replace('.', ',');
              return (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.title}
                  onClick={() =>
                    isBrlToArs
                      ? onPurchaseBrlChange(preset.value, true)
                      : onArsBudgetChange(preset.value)
                  }
                  className={`min-h-[36px] shrink-0 rounded-xl px-3 py-1 text-xs font-bold transition active:scale-95 ${
                    isActive
                      ? 'bg-[#5664F5] text-white shadow-sm'
                      : 'bank-subtle text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===================================================================
            CARTÃO VIRTUAL DE RESULTADO IMEDIATO (ESTILO "MY CARDS" DO EXEMPLO)
            Mostra na hora: R$ 100 -> $ 28.960 ARS no Cartão vs $ 30.691 no ARQ
            =================================================================== */}
        <div className="neobank-virtual-card mt-4 rounded-[24px] p-5">
          {/* Topo do Cartão */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="tracking-[0.2em] text-xs font-bold text-white/75">
                ••••
              </span>
              <span className="truncate text-xs font-bold text-white/95">
                {isBrlToArs
                  ? `No Cartão (${activeBankName})`
                  : `Poder de compra no Cartão`}
              </span>
            </div>

            <div className="flex items-center shrink-0" aria-hidden="true">
              <span className="h-5 w-5 rounded-full bg-white/80" />
              <span className="-ml-2 h-5 w-5 rounded-full bg-white/45" />
            </div>
          </div>

          {/* VALOR TOTAL GIGANTE EM PESOS (OU REAIS SE INVERTIDO) */}
          <div className="relative z-10 mt-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
              {isBrlToArs ? 'Você vai pagar em Pesos' : 'Você consegue gastar no Brasil'}
            </div>

            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex items-baseline tabular-nums">
                <span className="mr-1.5 text-xl sm:text-2xl font-bold text-white/85">
                  {isBrlToArs ? '$' : 'R$'}
                </span>
                <span className="text-4xl sm:text-[42px] font-extrabold leading-none tracking-tight text-white">
                  {isBrlToArs ? arsInt : brlInt}
                </span>
                <span className="text-lg sm:text-xl font-bold text-white/75">
                  {isBrlToArs ? arsDec : brlDec}
                </span>
                <span className="ml-2 text-xs font-bold uppercase text-white/75">
                  {isBrlToArs ? 'ARS' : 'BRL'}
                </span>
              </div>

              {/* Fatura em Dólares */}
              <span className="rounded-xl bg-white/18 px-2.5 py-1 text-xs font-extrabold text-white backdrop-blur-sm tabular-nums">
                Fatura: US${' '}
                {formatUsd(isBrlToArs ? simulation.dolaresFatura : reverseUsdCard)}
              </span>
            </div>
          </div>

          {/* Comparação Direta: Cartão vs ARQ/Pix + Economia */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/18 px-3.5 py-2.5 border border-white/15 backdrop-blur-md text-xs">
            <div className="text-white/85 tabular-nums">
              <span>No ARQ / Pix: </span>
              <strong className="font-extrabold text-white">
                {isBrlToArs
                  ? `$ ${formatArs(simulation.custoTotalArqArs, 0)} ARS`
                  : `R$ ${formatBrl(reverseBrlArq)}`}
              </strong>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/25 px-2.5 py-0.5 font-extrabold text-emerald-100 tabular-nums">
              {isBrlToArs ? (
                isSavingPositive ? (
                  <>
                    Economiza $ {formatArs(Math.abs(simulation.economiaTotalArs), 0)} (
                    {formatPct(simulation.descontoEfetivoPct, 1)})
                  </>
                ) : (
                  <>ARQ ganha por $ {formatArs(Math.abs(simulation.economiaTotalArs), 0)}</>
                )
              ) : isSavingPositive ? (
                <>+ R$ {formatBrl(Math.abs(reverseExtraBrl))} extras</>
              ) : (
                <>- R$ {formatBrl(Math.abs(reverseExtraBrl))}</>
              )}
            </div>
          </div>

          {/* Rodapé Compacto: As Duas Fórmulas por R$ 1,00 */}
          <div className="relative z-10 mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-white/12 px-3 py-2 border border-white/15">
              <div className="flex items-center justify-between text-[10px] font-semibold text-white/80">
                <span>Cotação Spot + Oficial</span>
                <span className="font-bold text-emerald-200 tabular-nums">
                  {formatPct(quotes.metodoBDescontoPct, 1)}
                </span>
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-white tabular-nums">
                $ {formatArs(quotes.metodoBCotacaoContinua)}{' '}
                <span className="text-[10px] font-medium text-white/70">/ R$ 1</span>
              </div>
            </div>

            <div className="rounded-xl bg-white/12 px-3 py-2 border border-white/15">
              <div className="flex items-center justify-between text-[10px] font-semibold text-white/80">
                <span>Fórmula -5,35%</span>
                <span className="font-bold text-white/90 tabular-nums">
                  {formatPct(quotes.metodoADescontoPct, 1)}
                </span>
              </div>
              <div className="mt-0.5 text-sm font-extrabold text-white tabular-nums">
                $ {formatArs(quotes.metodoACotacaoEstimada)}{' '}
                <span className="text-[10px] font-medium text-white/70">/ R$ 1</span>
              </div>
            </div>
          </div>

          {/* Botão Como Pagar Sem Imposto (Stop Debit) */}
          <button
            type="button"
            onClick={() => setShowStopDebitTip((prev) => !prev)}
            aria-expanded={showStopDebitTip}
            aria-controls="stop-debit-tip"
            className="relative z-10 mt-3 flex w-full items-center justify-between text-[11px] font-semibold text-white/85 hover:text-white transition"
          >
            <span>
              US$ 1 = R$ {formatBrl(quotes.usdBrlComercialSpot)} (-
              {formatPct(cardSpreadPct, 2)}) • Como zerar os 30% ARCA?
            </span>
            <ChevronRight
              className={`h-4 w-4 shrink-0 transition-transform ${
                showStopDebitTip ? 'rotate-90' : ''
              }`}
            />
          </button>

          {showStopDebitTip && (
            <div
              id="stop-debit-tip"
              className="relative z-10 mt-2 rounded-2xl bg-black/25 p-3 text-[11px] leading-relaxed text-white/95 border border-white/15"
            >
              Passe o cartão sempre em <strong>BRL</strong>. No fechamento da fatura, faça{' '}
              <em>Stop Debit</em> e pague o saldo em dólares usando os{' '}
              <strong>USD comprados no Oficial</strong> (ou configure o débito direto na{' '}
              <em>Caja de Ahorro en USD</em>).
            </div>
          )}
        </div>

        {/* Feedback sutil do Modo David quando aplicável */}
        {isBrlToArs && davidFeedback && (
          <div
            className={`mt-3 rounded-2xl border px-3.5 py-2.5 transition-all ${davidBannerStyles[davidFeedback.level]}`}
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

              {simulation.valorBrl >= 400 ? (
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

      {/* =====================================================================
          2. BASES DE COTAÇÃO (ARQ / DOLARAPP + BANCOS DE DÓLAR OFICIAL)
             Pré-preenchidas via API, editáveis com 1 toque
          ===================================================================== */}
      <div className="bank-surface rounded-[28px] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="arq-rate-input"
            className="text-xs font-bold text-[var(--text-primary)]"
          >
            Cotação Base no ARQ / DolarApp
          </label>

          {isArqManual && arqLiveRate ? (
            <button
              type="button"
              onClick={onResetArqToLive}
              className="inline-flex items-center gap-1 rounded-full bg-[#5664F5]/12 px-2.5 py-0.5 text-[11px] font-bold text-[var(--brand-primary)] active:scale-95 transition"
            >
              <RotateCcw className="h-3 w-3" />
              Auto ${formatArs(arqLiveRate)}
            </button>
          ) : (
            <span
              style={{
                backgroundColor: 'var(--positive-bg)',
                color: 'var(--positive-text)',
              }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
            >
              <CheckCircle2 className="h-3 w-3" />
              Automático
            </span>
          )}
        </div>

        <div className="bank-input mt-2 flex items-center rounded-2xl px-3.5 py-2 transition">
          <span className="mr-1.5 select-none text-base font-bold text-[var(--text-muted)]">
            $
          </span>
          <input
            id="arq-rate-input"
            name="arqRate"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={arqRateInput}
            onChange={(e) => onArqInputChange(e.target.value)}
            placeholder="308,00"
            className="w-full bg-transparent text-xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <span className="ml-2 shrink-0 text-xs font-bold text-[var(--text-muted)] tabular-nums">
            ARS / R$ 1
          </span>
        </div>

        {/* Seletor Rápido de Banco de Dólar Oficial */}
        <div className="mt-4 pt-3.5 border-t border-[var(--border-subtle)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Banco do Dólar Oficial
            </span>
            <span className="text-xs font-bold text-[var(--brand-primary)] tabular-nums">
              {activeBankName} • ${formatArs(activeOficialRate, 0)}
            </span>
          </div>

          <div
            role="group"
            aria-label="Selecionar banco de Dólar Oficial"
            className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1"
          >
            {oficialBanks.slice(0, 8).map((bank, idx) => {
              const isSelected = selectedBankSlug === bank.slug;
              return (
                <button
                  key={bank.slug}
                  type="button"
                  onClick={() => onSelectBank(bank.slug)}
                  aria-pressed={isSelected}
                  className={`flex min-h-[46px] shrink-0 items-center gap-2 rounded-2xl border px-3 py-1.5 text-left transition active:scale-95 ${
                    isSelected
                      ? 'bg-[#5664F5] border-[#5664F5] text-white shadow-md shadow-indigo-500/25'
                      : 'bank-subtle border-transparent text-[var(--text-primary)] hover:opacity-90'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      isSelected ? 'bg-white/20' : 'bg-[var(--bg-card)]'
                    }`}
                  >
                    <ProviderAvatar
                      src={bank.logoUrl}
                      name={bank.prettyName}
                      sizeClass="h-5 w-5"
                    />
                  </div>
                  <div className="leading-tight">
                    <div className="flex items-center gap-1 text-xs font-bold">
                      <span>{bank.prettyName}</span>
                      {idx === 0 && (
                        <span
                          className={`rounded px-1 text-[9px] font-extrabold ${
                            isSelected
                              ? 'bg-white/25 text-white'
                              : 'bg-[#5664F5]/15 text-[var(--brand-primary)]'
                          }`}
                        >
                          TOP
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-bold tabular-nums ${
                        isSelected ? 'text-white/90' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      ${formatArs(bank.ask || 0, 0)}
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onSelectBank('manual')}
              aria-pressed={selectedBankSlug === 'manual'}
              className={`flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                selectedBankSlug === 'manual'
                  ? 'bg-[#5664F5] border-[#5664F5] text-white shadow-md shadow-indigo-500/25'
                  : 'bank-subtle border-transparent text-[var(--text-primary)]'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Manual</span>
            </button>
          </div>

          {selectedBankSlug === 'manual' && (
            <div className="bank-subtle mt-2.5 rounded-2xl p-3">
              <label
                htmlFor="manual-oficial-input"
                className="mb-1.5 block text-xs font-bold text-[var(--text-primary)]"
              >
                Preço manual do Dólar Oficial (ARS/USD)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="manual-oficial-input"
                  name="manualOficial"
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={manualOficialInput}
                  onChange={(e) => onManualOficialChange(e.target.value)}
                  placeholder="1540"
                  className="bank-input w-full rounded-xl px-3 py-2 text-base font-bold text-[var(--text-primary)] tabular-nums focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => onManualOficialChange('1540')}
                  className="bank-surface shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)] active:scale-95"
                >
                  $1.540
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
