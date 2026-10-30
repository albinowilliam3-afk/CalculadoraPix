export interface PixQuotePair {
  symbol: 'BRLARS' | 'BRLUSD' | 'BRLUSDT' | string;
  buy: number;
  sell?: number;
  spread?: number;
  spread_pct?: number;
}

export interface PixProviderNormalized {
  slug: string;
  prettyName: string;
  /** Cotação direta em ARS por 1 BRL (quando fornecida pela carteira) */
  arsPerBrlDirect: number | null;
  /** Cotação em USD ou USDT por 1 BRL (ex: 0.1863 USD por R$ 1) */
  usdPerBrl: number | null;
  usdSymbol: 'BRLUSD' | 'BRLUSDT' | null;
  /** Cotação efetiva em ARS/BRL (direta ou estimada via USD Oficial/Cripto conforme jurisdição) */
  effectiveArsPerBrl: number | null;
  /** Se a cotação em ARS foi estimada a partir do par USD/USDT */
  isEstimatedArs: boolean;
  estimationBasis?: 'Oficial CBU' | 'Cripto/CCL' | 'MODO';
  logo: string;
  url: string;
  isPix: boolean;
  hasFees: boolean;
  updatedAt: string | null;
  stale: boolean;
}

export type UsdMarketType = 'Oficial' | 'MEP' | 'CCL' | 'Cripto' | string;

export interface UsdProviderQuote {
  slug: string;
  name: string;
  prettyName: string;
  bid: number | null;
  ask: number | null;
  logoUrl: string;
  is24x7: boolean;
  url: string;
  pctVariation: number | null;
  isBank: boolean;
  usdType: UsdMarketType;
  lastSeenAt: string | null;
  stale: boolean;
}

export interface SpotUsdBrlQuote {
  bid: number;
  ask: number;
  pctChange: number;
  updatedAt: string;
  source: 'awesomeapi' | 'er-api' | 'inferred' | 'fallback';
}

export interface LiveMarketBundle {
  pixProviders: PixProviderNormalized[];
  arqLiveRate: number | null;
  arqUsdPerBrl: number | null;
  usdProviders: UsdProviderQuote[];
  oficialBanks: UsdProviderQuote[];
  spotUsdBrl: SpotUsdBrlQuote;
  fetchedAt: string;
  pixSource: 'comparapix-direct' | 'comparapix-proxy' | 'comparapix-cors' | 'criptoya' | 'cache';
  usdSource: 'comparadolar' | 'comparadolar-proxy' | 'cache';
  isFromCache: boolean;
}

export interface CalculatorConfig {
  /** Fator empírico validado: 0.9465 (-5,3501% vs ARQ com Dólar Oficial base $1540) */
  empiricalFactor: number;
  /** Base de calibração do Dólar Oficial na transação real ($1540 ARS/USD) */
  empiricalBaseOficial: number;
  /** Spread interbancário + rede Visa/Mastercard (default: 0.0079 = 0,79%) */
  cardSpread: number;
  /** Override manual opcional para USD/BRL comercial spot */
  customSpotUsdBrl: number | null;
  /** Filtro Anti-Impulso David (Easter Egg sutil) */
  davidGuardEnabled: boolean;
}

export type PaymentMode = 'card' | 'pix';
export type InputCurrencyMode = 'BRL' | 'USD' | 'ARS';

export interface PersistedUserState {
  arqRateInput: string;
  isArqManual: boolean;
  selectedBankSlug: string | 'manual';
  selectedPixSlug?: string;
  paymentMode?: PaymentMode;
  inputCurrency?: InputCurrencyMode;
  manualOficialInput: string;
  purchaseBrlInput: string;
  usdAmountInput?: string;
  arsBudgetInput?: string;
  converterDirection?: 'BRL_TO_ARS' | 'ARS_TO_BRL';
  config: CalculatorConfig;
}
