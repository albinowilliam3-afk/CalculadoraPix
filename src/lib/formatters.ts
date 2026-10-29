const arsFormatter2 = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const arsFormatter0 = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFormatter2 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFormatter4 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const pctFormatter1 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pctFormatter2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatArs(value: number, decimals: 0 | 2 = 2): string {
  if (!Number.isFinite(value)) return '—';
  return decimals === 0 ? arsFormatter0.format(value) : arsFormatter2.format(value);
}

export function formatBrl(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return brlFormatter.format(value);
}

export function formatUsd(value: number, decimals: 2 | 4 = 2): string {
  if (!Number.isFinite(value)) return '—';
  return decimals === 4 ? usdFormatter4.format(value) : usdFormatter2.format(value);
}

export function formatPct(value: number, decimals: 1 | 2 = 1): string {
  if (!Number.isFinite(value)) return '0,0%';
  const formatted = decimals === 2 ? pctFormatter2.format(value) : pctFormatter1.format(value);
  return `${formatted}%`;
}

/**
 * Faz o parse resiliente de inputs digitados em teclados móveis Samsung/iOS
 * (suporta vírgula ou ponto decimal, ex: "308,50", "308.50", "1.540,25" ou "1540").
 */
export function parseFlexibleDecimal(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalized = cleaned;
  if (lastComma > -1 && lastDot > -1) {
    // Tem ambos: o último separador é o decimal, os anteriores são milhar
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Apenas vírgula -> decimal brasileiro/argentino
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      const dec = parts.pop();
      normalized = `${parts.join('')}.${dec}`;
    } else {
      normalized = cleaned.replace(',', '.');
    }
  } else if (lastDot > -1) {
    // Apenas ponto: se houver múltiplos pontos, remove milhares
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      const dec = parts.pop();
      normalized = `${parts.join('')}.${dec}`;
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'agora';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'agora';

  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 15) return 'agora mesmo';
  if (diffSec < 60) return `há ${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;

  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
