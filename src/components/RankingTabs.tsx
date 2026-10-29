import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  Building2,
  Check,
  Clock,
  CreditCard,
} from 'lucide-react';
import { formatArs, formatPct, formatUsd } from '../lib/formatters';
import type {
  PixProviderNormalized,
  UsdMarketType,
  UsdProviderQuote,
} from '../types/finance';
import { ProviderAvatar } from './ProviderAvatar';

interface RankingTabsProps {
  pixProviders: PixProviderNormalized[];
  usdProviders: UsdProviderQuote[];
  cardReferenceRate: number;
  activeBankName: string;
  activeOficialRate: number;
  selectedBankSlug: string | 'manual';
  onSelectPixRateForHero: (rate: number, providerName: string) => void;
  onSelectOficialBank: (slug: string, bankName: string, ask: number) => void;
}

export const RankingTabs: React.FC<RankingTabsProps> = ({
  pixProviders,
  usdProviders,
  cardReferenceRate,
  activeBankName,
  activeOficialRate,
  selectedBankSlug,
  onSelectPixRateForHero,
  onSelectOficialBank,
}) => {
  const [activeTab, setActiveTab] = useState<'pix' | 'dolar'>('pix');
  const [pixFilter, setPixFilter] = useState<'wallets' | 'direct' | 'all'>('wallets');
  const [usdFilter, setUsdFilter] = useState<'Oficial' | 'MEP' | 'CriptoCCL' | 'all'>(
    'Oficial'
  );

  const panelHeadingRef = useRef<HTMLHeadingElement>(null);

  const switchTabWithTransition = (nextTab: 'pix' | 'dolar') => {
    if (nextTab === activeTab) return;

    const docWithVT = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };

    if (!docWithVT.startViewTransition) {
      setActiveTab(nextTab);
      requestAnimationFrame(() => {
        panelHeadingRef.current?.focus({ preventScroll: true });
      });
      return;
    }

    const transition = docWithVT.startViewTransition(() => {
      flushSync(() => {
        setActiveTab(nextTab);
      });
    });

    transition.finished.finally(() => {
      panelHeadingRef.current?.focus({ preventScroll: true });
    });
  };

  const visiblePix = pixProviders.filter((p) => {
    if (pixFilter === 'direct') {
      return !p.isEstimatedArs;
    }
    if (pixFilter === 'wallets') {
      return p.estimationBasis !== 'Oficial CBU';
    }
    return true;
  });

  const walletsBeatingCard = visiblePix.filter(
    (p) => (p.effectiveArsPerBrl ?? Infinity) < cardReferenceRate
  );
  const walletsLosingToCard = visiblePix.filter(
    (p) => (p.effectiveArsPerBrl ?? Infinity) >= cardReferenceRate
  );

  const visibleUsd = usdProviders.filter((u) => {
    const typeNorm = u.usdType.toLowerCase();
    if (usdFilter === 'Oficial') return typeNorm === 'oficial';
    if (usdFilter === 'MEP') return typeNorm === 'mep';
    if (usdFilter === 'CriptoCCL')
      return typeNorm === 'cripto' || typeNorm === 'ccl';
    return true;
  });

  const getUsdBadgeStyle = (usdType: UsdMarketType) => {
    const lower = usdType.toLowerCase();
    if (lower === 'oficial') return 'bg-emerald-500/12 text-[var(--positive-text)]';
    if (lower === 'mep') return 'bg-[#5664F5]/12 text-[var(--brand-primary)]';
    return 'bg-purple-500/12 text-purple-500';
  };

  return (
    <section
      id="ranking"
      aria-label="Rankings ao vivo de Pix e Dólar Oficial"
      className="bank-surface rounded-[28px] p-5"
    >
      {/* Grabber sutil estilo Bottom Sheet "Transactions" da referência */}
      <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-[var(--border-subtle)]" />

      {/* Segmented Toggle Pill idêntico ao "Savings | Expenses" da imagem de referência */}
      <div
        role="tablist"
        aria-label="Alternar entre Ranking Pix e Ranking Dólar"
        className="mx-auto grid max-w-xs grid-cols-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-1"
      >
        <button
          role="tab"
          type="button"
          id="tab-pix"
          aria-selected={activeTab === 'pix'}
          aria-controls="panel-pix"
          onClick={() => switchTabWithTransition('pix')}
          className="relative flex min-h-[40px] items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition"
        >
          {activeTab === 'pix' && (
            <span className="active-tab-pill absolute inset-0 rounded-xl shadow-sm" />
          )}
          <span
            style={
              activeTab === 'pix' ? { color: 'var(--tab-active-text)' } : undefined
            }
            className={`relative z-10 ${
              activeTab === 'pix' ? '' : 'text-[var(--text-muted)]'
            }`}
          >
            Ranking Pix
          </span>
        </button>

        <button
          role="tab"
          type="button"
          id="tab-dolar"
          aria-selected={activeTab === 'dolar'}
          aria-controls="panel-dolar"
          onClick={() => switchTabWithTransition('dolar')}
          className="relative flex min-h-[40px] items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition"
        >
          {activeTab === 'dolar' && (
            <span className="active-tab-pill absolute inset-0 rounded-xl shadow-sm" />
          )}
          <span
            style={
              activeTab === 'dolar' ? { color: 'var(--tab-active-text)' } : undefined
            }
            className={`relative z-10 ${
              activeTab === 'dolar' ? '' : 'text-[var(--text-muted)]'
            }`}
          >
            Dólar Oficial
          </span>
        </button>
      </div>

      {/* ===================================================================
          ABA 1: RANKING PIX + BANNER DO CARTÃO
          =================================================================== */}
      {activeTab === 'pix' ? (
        <div
          id="panel-pix"
          role="tabpanel"
          aria-labelledby="tab-pix"
          className="mt-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              ref={panelHeadingRef}
              tabIndex={-1}
              className="text-base font-extrabold text-[var(--text-primary)] focus:outline-none"
            >
              Carteiras Pix ({visiblePix.length})
            </h3>

            <div className="bank-subtle flex items-center gap-0.5 rounded-xl p-0.5">
              {(
                [
                  { id: 'wallets', label: 'Carteiras' },
                  { id: 'direct', label: 'ARS Direto' },
                  { id: 'all', label: '+Bancos' },
                ] as const
              ).map((filterItem) => (
                <button
                  key={filterItem.id}
                  type="button"
                  onClick={() => setPixFilter(filterItem.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    pixFilter === filterItem.id
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {filterItem.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Toque em uma carteira para usar sua cotação no simulador.
          </p>

          <div className="mt-3.5 space-y-2">
            {walletsBeatingCard.map((provider, index) => (
              <PixRow
                key={provider.slug}
                rank={index + 1}
                provider={provider}
                cardReferenceRate={cardReferenceRate}
                beatsCard={true}
                onSelect={() =>
                  provider.effectiveArsPerBrl &&
                  onSelectPixRateForHero(
                    provider.effectiveArsPerBrl,
                    provider.prettyName
                  )
                }
              />
            ))}

            {/* LINHA DIVISÓRIA DO CARTÃO ESTILO BANNER BANCÁRIO MODERNO */}
            <div className="neobank-limit-banner my-3 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold text-white">
                      Cartão USD • {activeBankName}
                    </div>
                    <p className="text-[11px] text-white/80 truncate">
                      {walletsBeatingCard.length === 0
                        ? 'Mais barato que todas as carteiras abaixo'
                        : `Vence ${walletsLosingToCard.length} carteiras abaixo`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <div className="text-base font-extrabold text-white">
                    ${formatArs(cardReferenceRate)}
                  </div>
                  <div className="text-[10px] font-semibold text-white/80">
                    USD ${formatArs(activeOficialRate, 0)}
                  </div>
                </div>
              </div>
            </div>

            {walletsLosingToCard.map((provider, index) => (
              <PixRow
                key={provider.slug}
                rank={walletsBeatingCard.length + index + 1}
                provider={provider}
                cardReferenceRate={cardReferenceRate}
                beatsCard={false}
                onSelect={() =>
                  provider.effectiveArsPerBrl &&
                  onSelectPixRateForHero(
                    provider.effectiveArsPerBrl,
                    provider.prettyName
                  )
                }
              />
            ))}
          </div>

          <div className="bank-subtle mt-4 rounded-2xl p-3.5 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <strong className="text-[var(--text-primary)]">
              💡 Lembrete importante:
            </strong>{' '}
            se você deixar a fatura debitar em Pesos (com 30% ARCA), o Real sobe para{' '}
            <strong className="tabular-nums text-[var(--negative-text)]">
              ~${formatArs(cardReferenceRate * 1.3)} ARS/BRL
            </strong>
            . Quite sempre com seus dólares comprados no Oficial!
          </div>
        </div>
      ) : (
        /* ===================================================================
           ABA 2: RANKING DÓLAR OFICIAL, MEP E CRIPTO/CCL
           =================================================================== */
        <div
          id="panel-dolar"
          role="tabpanel"
          aria-labelledby="tab-dolar"
          className="mt-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              ref={panelHeadingRef}
              tabIndex={-1}
              className="text-base font-extrabold text-[var(--text-primary)] focus:outline-none"
            >
              Bancos &amp; Dólar
            </h3>

            <div className="bank-subtle no-scrollbar flex items-center gap-0.5 overflow-x-auto rounded-xl p-0.5">
              {(
                [
                  { id: 'Oficial', label: 'Oficial' },
                  { id: 'MEP', label: 'MEP' },
                  { id: 'CriptoCCL', label: 'CCL/Cripto' },
                  { id: 'all', label: 'Todos' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setUsdFilter(chip.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    usdFilter === chip.id
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alerta Visual BCRA Clean */}
          <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-3.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                <p className="font-bold text-[var(--text-primary)]">
                  Diferença Oficial (CBU) vs. CCL/Cripto:
                </p>
                <p className="mt-0.5">
                  O <strong>Dólar Oficial</strong> exige conta bancária CBU da mesma
                  titularidade e possui <strong>trava cruzada de 90 dias do BCRA</strong>{' '}
                  com MEP/CCL. Já carteiras <em>CCL/Cripto</em> operam fora do MULC (evite
                  falsos &ldquo;rulos&rdquo;).
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {visibleUsd.map((bank) => {
              const isSelected = selectedBankSlug === bank.slug;
              const askPrice = bank.ask ?? 0;

              return (
                <div
                  key={`${bank.slug}-${bank.usdType}`}
                  onClick={() =>
                    askPrice > 0 &&
                    onSelectOficialBank(bank.slug, bank.prettyName, askPrice)
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && askPrice > 0) {
                      e.preventDefault();
                      onSelectOficialBank(bank.slug, bank.prettyName, askPrice);
                    }
                  }}
                  className={`flex items-center justify-between gap-3 rounded-2xl p-3 transition cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? 'bg-[#5664F5]/[0.09] ring-1 ring-[#5664F5]/40'
                      : 'hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bank-subtle flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                      <ProviderAvatar
                        src={bank.logoUrl}
                        name={bank.prettyName}
                        sizeClass="h-6 w-6"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate text-sm font-bold text-[var(--text-primary)]">
                          {bank.prettyName}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${getUsdBadgeStyle(
                            bank.usdType
                          )}`}
                        >
                          {bank.usdType}
                        </span>
                        {bank.is24x7 && (
                          <span className="bank-subtle inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold text-[var(--text-secondary)]">
                            <Clock className="h-2.5 w-2.5 text-[var(--brand-primary)]" />
                            24/7
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)] tabular-nums">
                        {bank.isBank && (
                          <span className="inline-flex items-center gap-0.5">
                            <Building2 className="h-3 w-3" />
                            CBU
                          </span>
                        )}
                        {bank.bid && <span>Compra: ${formatArs(bank.bid, 0)}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right tabular-nums">
                      <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
                        $ {formatArs(askPrice, askPrice % 1 === 0 ? 0 : 2)}
                      </div>
                      <div className="text-[10px] font-bold text-[var(--brand-primary)]">
                        {isSelected ? 'Selecionado' : 'Usar base'}
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5664F5] text-white">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                    ) : (
                      <a
                        href={bank.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Abrir site de ${bank.prettyName}`}
                        className="bank-subtle flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

interface PixRowProps {
  rank: number;
  provider: PixProviderNormalized;
  cardReferenceRate: number;
  beatsCard: boolean;
  onSelect: () => void;
}

const PixRow: React.FC<PixRowProps> = ({
  rank,
  provider,
  cardReferenceRate,
  beatsCard,
  onSelect,
}) => {
  const rate = provider.effectiveArsPerBrl ?? 0;
  const diffArs = rate - cardReferenceRate;
  const diffPct = cardReferenceRate > 0 ? (diffArs / cardReferenceRate) * 100 : 0;
  const isArq = provider.slug === 'arq';

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex items-center justify-between gap-2.5 rounded-2xl p-2.5 transition cursor-pointer active:scale-[0.99] ${
        isArq
          ? 'bg-[#5664F5]/[0.08] ring-1 ring-[#5664F5]/30'
          : 'hover:bg-[var(--bg-subtle)]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Ícone Circular Estilo "Transactions" da imagem de referência */}
        <div className="bank-subtle relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <ProviderAvatar
            src={provider.logo}
            name={provider.prettyName}
            sizeClass="h-6 w-6"
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--bg-card)] px-1 text-[9px] font-extrabold text-[var(--text-muted)] shadow-sm tabular-nums">
            {rank}
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="truncate text-sm font-bold text-[var(--text-primary)]">
              {provider.prettyName}
            </span>
            {isArq && (
              <span className="rounded-md bg-[#5664F5]/15 px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--brand-primary)]">
                ARQ
              </span>
            )}
            {beatsCard && (
              <span
                style={{
                  backgroundColor: 'var(--positive-bg)',
                  color: 'var(--positive-text)',
                }}
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold"
              >
                <Award className="h-2.5 w-2.5" />
                Ganha
              </span>
            )}
            {provider.hasFees && (
              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                +Taxa
              </span>
            )}
          </div>

          <div className="mt-0.5 text-xs text-[var(--text-muted)] tabular-nums truncate">
            {provider.isEstimatedArs ? (
              <span>
                via {provider.estimationBasis} • US$ {formatUsd(provider.usdPerBrl || 0, 4)}
              </span>
            ) : provider.usdPerBrl ? (
              <span>US$ {formatUsd(provider.usdPerBrl, 4)} / R$</span>
            ) : (
              <span>Cotação direta em Pesos</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right tabular-nums">
          <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
            ${formatArs(rate)}
          </div>
          <div
            style={{
              color: beatsCard ? 'var(--positive-text)' : 'var(--negative-text)',
            }}
            className="text-[11px] font-bold"
          >
            {diffArs >= 0 ? '+ ' : ''}
            {formatPct(diffPct, 1)}
          </div>
        </div>

        <a
          href={provider.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Abrir ${provider.prettyName}`}
          className="bank-subtle flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};
