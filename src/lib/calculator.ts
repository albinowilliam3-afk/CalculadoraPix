import type { CalculatorConfig } from '../types/finance';

export const DEFAULT_CONFIG: CalculatorConfig = {
  empiricalFactor: 0.9465, // -5,3501% validado empiricamente vs ARQ
  empiricalBaseOficial: 1540, // Dólar Oficial de referência da calibração ($1.540 ARS)
  cardSpread: 0.0079, // 0,79% spread interbancário Visa/Mastercard + arredondamento
  customSpotUsdBrl: null,
  davidGuardEnabled: true,
  defaultBankSlug: 'uala',
  defaultPixSlug: 'banco-galicia',
};

/**
 * Fator empírico de conversão EUR -> USD na rede internacional do cartão:
 * Validado pela compra real: € 31,45 lançados pelo banco como US$ 35,68 (taxa efetiva 1,1344992).
 */
export const EMPIRICAL_EUR_TO_USD_CARD_RATE = 35.68 / 31.45;

/**
 * Arredonda para cima em 2 casas decimais (como nas faturas reais de cartão em USD:
 * ex: R$ 10,64 / 4,925975 = US$ 2,159978 -> US$ 2,16).
 */
export function roundUp2Decimals(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  // .toFixed(6) evita artefatos IEEE-754 como 2.1600000000000005 virar 2.17
  const scaled = Number((value * 100).toFixed(6));
  return Math.ceil(scaled) / 100;
}

export interface DualCardQuoteResult {
  /** Método A: Estimativa Rápida por Proporção Empírica (-5,35% ajustado pelo Dólar Oficial) */
  metodoACotacaoEstimada: number;
  metodoADescontoPct: number;
  metodoAEconomiaPorReal: number;

  /** Método B: Taxa Spot Comercial + Spread Bandeira + Dólar Oficial Bancário (por R$ 1 contínuo) */
  usdBrlComercialSpot: number;
  usdBrlBandeira: number;
  metodoBCotacaoContinua: number;
  metodoBDescontoPct: number;
  metodoBEconomiaPorReal: number;

  /** Melhor referência consolidada para posicionar o Cartão no Ranking Pix */
  cardReferenceRate: number;
  implicitUsdCriptoArq: number;
}

export function calculateDualCardQuotes(params: {
  cotacaoArq: number;
  dolarOficial: number;
  liveSpotUsdBrl: number;
  config: CalculatorConfig;
}): DualCardQuoteResult {
  const { cotacaoArq, dolarOficial, liveSpotUsdBrl, config } = params;

  const safeArq = Math.max(0, cotacaoArq);
  const safeOficial = Math.max(0, dolarOficial);
  const effectiveSpot =
    config.customSpotUsdBrl && config.customSpotUsdBrl > 0
      ? config.customSpotUsdBrl
      : liveSpotUsdBrl > 0
        ? liveSpotUsdBrl
        : 5.39;

  // Método A: Cotacao_ARQ * 0.9465 * (Dolar_Oficial_Input / 1540)
  const metodoACotacaoEstimada =
    safeArq > 0 && safeOficial > 0
      ? safeArq * config.empiricalFactor * (safeOficial / config.empiricalBaseOficial)
      : 0;

  const metodoAEconomiaPorReal = safeArq > 0 ? safeArq - metodoACotacaoEstimada : 0;
  const metodoADescontoPct =
    safeArq > 0 ? ((metodoACotacaoEstimada - safeArq) / safeArq) * 100 : 0;

  // Método B: USD_BRL_Bandeira = USD_BRL_Comercial_Spot * (1 - Spread_Bandeira)
  const usdBrlBandeira = effectiveSpot * (1 - config.cardSpread);
  const metodoBCotacaoContinua =
    usdBrlBandeira > 0 && safeOficial > 0 ? safeOficial / usdBrlBandeira : 0;

  const metodoBEconomiaPorReal = safeArq > 0 ? safeArq - metodoBCotacaoContinua : 0;
  const metodoBDescontoPct =
    safeArq > 0 ? ((metodoBCotacaoContinua - safeArq) / safeArq) * 100 : 0;

  const implicitUsdCriptoArq = safeArq * effectiveSpot;

  return {
    metodoACotacaoEstimada,
    metodoADescontoPct,
    metodoAEconomiaPorReal,
    usdBrlComercialSpot: effectiveSpot,
    usdBrlBandeira,
    metodoBCotacaoContinua,
    metodoBDescontoPct,
    metodoBEconomiaPorReal,
    cardReferenceRate: metodoBCotacaoContinua > 0 ? metodoBCotacaoContinua : metodoACotacaoEstimada,
    implicitUsdCriptoArq,
  };
}

export interface PurchaseSimulationResult {
  valorBrl: number;
  usdBrlBandeira: number;
  dolaresFatura: number;
  custoTotalCartaoArs: number;
  cotacaoEfetivaExataCartao: number;
  custoTotalArqArs: number;
  economiaPorReal: number;
  economiaTotalArs: number;
  economiaEquivalenteBrl: number;
  descontoEfetivoPct: number;
  /** Custo caso usasse Método A (para transparência) */
  custoEstimadoMetodoAArs: number;
}

export function simulateRealPurchase(params: {
  valorBrl: number;
  cotacaoArq: number;
  dolarOficialBanco: number;
  usdBrlBandeira: number;
  metodoACotacaoEstimada: number;
}): PurchaseSimulationResult {
  const { valorBrl, cotacaoArq, dolarOficialBanco, usdBrlBandeira, metodoACotacaoEstimada } = params;

  if (valorBrl <= 0 || usdBrlBandeira <= 0 || dolarOficialBanco <= 0) {
    return {
      valorBrl: Math.max(0, valorBrl),
      usdBrlBandeira,
      dolaresFatura: 0,
      custoTotalCartaoArs: 0,
      cotacaoEfetivaExataCartao: 0,
      custoTotalArqArs: Math.max(0, valorBrl * cotacaoArq),
      economiaPorReal: 0,
      economiaTotalArs: 0,
      economiaEquivalenteBrl: 0,
      descontoEfetivoPct: 0,
      custoEstimadoMetodoAArs: 0,
    };
  }

  const dolaresFatura = roundUp2Decimals(valorBrl / usdBrlBandeira);
  const custoTotalCartaoArs = dolaresFatura * dolarOficialBanco;
  const cotacaoEfetivaExataCartao = custoTotalCartaoArs / valorBrl;
  const custoTotalArqArs = valorBrl * cotacaoArq;

  const economiaPorReal = cotacaoArq > 0 ? cotacaoArq - cotacaoEfetivaExataCartao : 0;
  const economiaTotalArs = cotacaoArq > 0 ? custoTotalArqArs - custoTotalCartaoArs : 0;
  const economiaEquivalenteBrl =
    cotacaoEfetivaExataCartao > 0 ? economiaTotalArs / cotacaoEfetivaExataCartao : 0;
  const descontoEfetivoPct =
    cotacaoArq > 0 ? ((cotacaoEfetivaExataCartao - cotacaoArq) / cotacaoArq) * 100 : 0;

  return {
    valorBrl,
    usdBrlBandeira,
    dolaresFatura,
    custoTotalCartaoArs,
    cotacaoEfetivaExataCartao,
    custoTotalArqArs,
    economiaPorReal,
    economiaTotalArs,
    economiaEquivalenteBrl,
    descontoEfetivoPct,
    custoEstimadoMetodoAArs: valorBrl * metodoACotacaoEstimada,
  };
}

export interface DavidSpendingFeedback {
  level: 'benchmark' | 'calm' | 'watch' | 'warning' | 'critical';
  badge: string;
  detail: string;
}

const CALM_PHRASES: Array<{ badge: string; detail: string }> = [
  {
    badge: '👀 Humm, estou de olho hein, David...',
    detail: 'Por enquanto tá comportado. Continua assim que ninguém briga na fatura!',
  },
  {
    badge: '👏 Aí sim, David! Gastando direitinho',
    detail: 'Valorzinho honesto, nem doeu no bolso. Pode aproximar o cartão em paz!',
  },
  {
    badge: '🤨 Só isso mesmo ou é só o aquecimento, David?',
    detail: 'Te conhecendo, começa nos R$ 25 e daqui a 10 minutos quer levar a loja toda...',
  },
  {
    badge: '😌 Passou no meu teste, viu David?',
    detail: 'Gastando com consciência assim eu nem falo nada, só orgulho!',
  },
  {
    badge: '👀 Tô só observando daqui, hein...',
    detail: 'Valor tranquilo, mas já tô vigiando a próxima maquininha!',
  },
];

const WATCH_PHRASES: Array<{ badge: string; detail: string }> = [
  {
    badge: '🤨 Vai gastar em quê isso aí, David?',
    detail: 'Espero muito que seja algo útil (ou comida boa pra nós dois)!',
  },
  {
    badge: '☝️ Se controla hein, David!',
    detail: 'Economizar no câmbio oficial é ótimo, mas não significa que saiu de graça!',
  },
  {
    badge: '👀 Humm, estou de olho nessa empolgação...',
    detail: 'Já começou a se soltar nas comprinhas, né? Segura essa mão aberta aí!',
  },
  {
    badge: '😅 Ó o dedinho coçando pra passar o cartão...',
    detail: 'Pensa direitinho antes de aproximar na maquininha, hein David!',
  },
  {
    badge: '🧐 Humm... precisa mesmo disso agora, David?',
    detail: 'Lembra que a viagem não acaba hoje e os dólares vêm todos na fatura!',
  },
];

const WARNING_PHRASES: Array<{ badge: string; detail: string }> = [
  {
    badge: '😳 Tudo isso, David?! Vai gastar em quê?',
    detail: 'Me explica essa compra aí direito antes de encostar o cartão na maquininha!',
  },
  {
    badge: '😤 Se controla hein!! Tá achando que tá rico?',
    detail: 'Olha o tanto de Pesos ali em cima... respira fundo 10 segundos e pensa duas vezes!',
  },
  {
    badge: '👀 Humm, lá vem o David inventando moda...',
    detail: 'Se for presente pra mim tá liberado. Se for capricho aleatório, guarda esse cartão!',
  },
  {
    badge: '🫠 David do céu, segura essa mão aberta!',
    detail: 'Daqui a pouco vai querer comprar até a maquininha do vendedor. Juízo hein!',
  },
  {
    badge: '🤨 Tem certeza absoluta disso, David?',
    detail: 'Depois quando fecha a fatura em dólar faz aquela cara de "ué, nem gastei nada"!',
  },
];

const CRITICAL_PHRASES: Array<{ badge: string; detail: string }> = [
  {
    badge: '🚨 Olha a loucura, lá vai torrar o dinheiro!',
    detail: 'Não falo nada com você, David... olha o tamanho desse estrago em Pesos!',
  },
  {
    badge: '💸 Você vai ficar pobre desse jeito, David!!',
    detail: 'Pelo amor de Deus, se controla homem!! Olha quanto vai dar na fatura!',
  },
  {
    badge: '😶 Não falo nada com você...',
    detail: 'Tô literalmente em silêncio olhando você simular uma compra desse tamanho.',
  },
  {
    badge: '😱 Tudo isso, David?! Comprou a loja inteira?!',
    detail: 'Lá vai torrar o dinheiro todo numa passada só de cartão... respira!!',
  },
];

function pickPhrase(
  pool: Array<{ badge: string; detail: string }>,
  valorBrl: number,
  seed: number
): { badge: string; detail: string } {
  const idx = Math.abs(Math.floor(valorBrl) + seed) % pool.length;
  return pool[idx];
}

/**
 * Recados bem-humorados em 1ª pessoa falando direto com o David conforme o valor em Reais.
 */
export function getDavidSpendingFeedback(
  valorBrl: number,
  _economiaTotalArs: number,
  enabled: boolean,
  phraseSeed = 0
): DavidSpendingFeedback | null {
  if (!enabled || valorBrl <= 0) return null;

  // Easter egg especial da transação real de calibração R$ 10,64!
  if (Math.abs(valorBrl - 10.64) < 0.005) {
    return {
      level: 'benchmark',
      badge: '🎯 R$ 10,64 — A compra real do teste!',
      detail:
        'A transação original que cravou os US$ 2,16 na fatura. Nessa aqui eu não falo nada, David!',
    };
  }

  if (valorBrl < 80) {
    const picked = pickPhrase(CALM_PHRASES, valorBrl, phraseSeed);
    return {
      level: 'calm',
      badge: picked.badge,
      detail: picked.detail,
    };
  }

  if (valorBrl < 200) {
    const picked = pickPhrase(WATCH_PHRASES, valorBrl, phraseSeed);
    return {
      level: 'watch',
      badge: picked.badge,
      detail: picked.detail,
    };
  }

  if (valorBrl < 400) {
    const picked = pickPhrase(WARNING_PHRASES, valorBrl, phraseSeed);
    return {
      level: 'warning',
      badge: picked.badge,
      detail: picked.detail,
    };
  }

  const picked = pickPhrase(CRITICAL_PHRASES, valorBrl, phraseSeed);
  return {
    level: 'critical',
    badge: picked.badge,
    detail: picked.detail,
  };
}
