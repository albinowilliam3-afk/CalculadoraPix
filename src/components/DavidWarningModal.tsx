import React, { useEffect, useRef, useState } from 'react';
import { Check, Dices, RotateCcw, X } from 'lucide-react';
import { formatArs, formatBrl, formatUsd } from '../lib/formatters';
import { attachDialogFallbacks, closeTopLayerDialog } from '../lib/topLayerDialog';

interface DavidWarningModalProps {
  isOpen: boolean;
  valorBrl: number;
  custoTotalArs: number;
  dolaresFatura: number;
  variantIndex: number;
  onAccept: () => void;
  onLowerToSafeAmount: () => void;
  onNextVariant: () => void;
}

interface HighSpendJokeTemplate {
  tag: string;
  title: string;
  getMessage: (brl: string, ars: string, usd: string) => string;
  acceptLabel: string;
  accent: 'rose' | 'amber' | 'violet';
}

export const DAVID_HIGH_SPEND_MODALS: HighSpendJokeTemplate[] = [
  {
    tag: 'ALERTA DE LOUCURA',
    title: 'Olha a loucura, lá vai torrar o dinheiro!',
    getMessage: (brl, ars) =>
      `Tudo isso, David?! R$ ${brl} ($ ${ars} Pesos!) numa tacada só?! Vai comprar a loja inteira ou o vendedor vem junto na sacola?`,
    acceptLabel: 'Aceitar (tô ciente da loucura 😅)',
    accent: 'rose',
  },
  {
    tag: 'PLANTÃO DO BOLSO VAZIO',
    title: 'Você vai ficar pobre, David!!',
    getMessage: (_brl, ars, usd) =>
      `Olha bem pros US$ ${usd} ($ ${ars} ARS) que vão cair na fatura... Se continuar nesse ritmo, na volta pra Argentina vai viver de vento e água!`,
    acceptLabel: 'Aceitar mesmo assim 🫣',
    accent: 'rose',
  },
  {
    tag: 'MODO SILÊNCIO ABSOLUTO',
    title: 'Não falo nada com você...',
    getMessage: (brl) =>
      `Sério mesmo, R$ ${brl}?! Nem vou falar mais nada, David. Só tô aqui de braços cruzados olhando você cogitar passar esse valor na maquininha.`,
    acceptLabel: 'Aceitar o julgamento silencioso 😶',
    accent: 'violet',
  },
  {
    tag: 'INTERROGATÓRIO IMEDIATO',
    title: 'Tudo isso, David?! Vai gastar em quê?',
    getMessage: (_brl, ars) =>
      `Me dá um bom motivo pra torrar $ ${ars} Pesos agora! (Spoiler: se for presente pra mim, tá 100% perdoado na hora ❤️).`,
    acceptLabel: 'Aceitar e continuar 👀',
    accent: 'amber',
  },
  {
    tag: 'FREIO DE MÃO FINANCEIRO',
    title: 'Se controla hein!! Achou petróleo foi?',
    getMessage: (brl) =>
      `O cartão economiza no câmbio oficial, mas passar R$ ${brl} de uma vez não é investimento não, viu bonito?! Respira fundo antes de aproximar!`,
    acceptLabel: 'Aceitar (prometo me controlar 🙏)',
    accent: 'amber',
  },
  {
    tag: 'AUDITORIA DA FATURA',
    title: 'Lá vai o mão aberta atacar de novo!',
    getMessage: (brl, _ars, usd) =>
      `R$ ${brl} hoje viram US$ ${usd} na fatura! Depois quando fechar o cartão não vem fazer cara de "ué, quem gastou tudo isso?". Foi você, David!!`,
    acceptLabel: 'Aceitar a culpa e seguir 😂',
    accent: 'rose',
  },
  {
    tag: 'CHAMADO AO BANCO',
    title: 'Alô, banco? Pode travar o cartão do David!',
    getMessage: (brl, ars) =>
      `R$ ${brl} ($ ${ars} ARS) simulados sem nem piscar! Humm, estou muito de olho nessa empolgação toda aí hein...`,
    acceptLabel: 'Aceitar e liberar compra 💳',
    accent: 'violet',
  },
];

export const DavidWarningModal: React.FC<DavidWarningModalProps> = ({
  isOpen,
  valorBrl,
  custoTotalArs,
  dolaresFatura,
  variantIndex,
  onAccept,
  onLowerToSafeAmount,
  onNextVariant,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [isShaking, setIsShaking] = useState(true);

  const activeTemplate =
    DAVID_HIGH_SPEND_MODALS[
      ((variantIndex % DAVID_HIGH_SPEND_MODALS.length) +
        DAVID_HIGH_SPEND_MODALS.length) %
        DAVID_HIGH_SPEND_MODALS.length
    ];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const cleanup = attachDialogFallbacks(dialog, () => {
      void handleDismissAccept();
    });

    if (isOpen && !dialog.open) {
      dialog.showModal();
      triggerShake();
    } else if (!isOpen && dialog.open) {
      void closeTopLayerDialog(dialog);
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const triggerShake = () => {
    setIsShaking(false);
    requestAnimationFrame(() => {
      setShakeKey((k) => k + 1);
      setIsShaking(true);
    });
  };

  const handleDismissAccept = async () => {
    await closeTopLayerDialog(dialogRef.current);
    onAccept();
  };

  const handleRepentAndLower = async () => {
    await closeTopLayerDialog(dialogRef.current);
    onLowerToSafeAmount();
  };

  const handleShuffleJoke = () => {
    onNextVariant();
    triggerShake();
  };

  const formattedBrl = formatBrl(valorBrl);
  const formattedArs = formatArs(custoTotalArs, 0);
  const formattedUsd = formatUsd(dolaresFatura);

  const badgeTone =
    activeTemplate.accent === 'rose'
      ? 'bg-rose-500/12 text-rose-500 border-rose-500/20'
      : activeTemplate.accent === 'amber'
        ? 'bg-amber-500/12 text-amber-500 border-amber-500/20'
        : 'bg-[#5664F5]/12 text-[var(--brand-primary)] border-[#5664F5]/20';

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="david-modal-title"
      onClose={onAccept}
      className="app-alert-modal"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          void handleDismissAccept();
        }}
        className="relative overflow-hidden p-5 sm:p-6 text-center"
      >
        {/* Botão fechar discreto no canto */}
        <button
          type="button"
          onClick={() => void handleDismissAccept()}
          aria-label="Fechar aviso"
          className="bank-subtle absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ÍCONE 3D MODERNO COM ANIMAÇÃO DE NEGAÇÃO (TOQUE PARA SACUDIR DE NOVO) */}
        <div className="mx-auto mt-1 mb-3 flex justify-center">
          <div
            key={shakeKey}
            onClick={triggerShake}
            role="button"
            tabIndex={0}
            aria-label="Ícone 3D de alerta de gasto — toque para animar negação"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                triggerShake();
              }
            }}
            className={`david-3d-emblem relative flex h-28 w-28 items-center justify-center select-none ${
              isShaking ? 'is-shaking' : ''
            }`}
          >
            {/* Halo luminoso suave estilo 3D Banking */}
            <div
              aria-hidden="true"
              className="absolute inset-2 rounded-full bg-gradient-to-tr from-rose-500/25 via-[#5664F5]/20 to-amber-400/25 blur-xl"
            />
            <ThreeDCardAlertIllustration />
          </div>
        </div>

        {/* Tag + Botão Sortear Outra Frase */}
        <div className="flex items-center justify-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badgeTone}`}
          >
            {activeTemplate.tag}
          </span>

          <button
            type="button"
            onClick={handleShuffleJoke}
            title="Sortear outra frase para o David"
            className="bank-subtle inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition"
          >
            <Dices className="h-3 w-3 text-[var(--brand-primary)]" />
            <span>Outra frase</span>
          </button>
        </div>

        {/* Título Engraçado em Destaque */}
        <h2
          id="david-modal-title"
          className="mt-3 text-xl font-extrabold leading-snug tracking-tight text-[var(--text-primary)]"
        >
          &ldquo;{activeTemplate.title}&rdquo;
        </h2>

        {/* Mensagem Direta pro David */}
        <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {activeTemplate.getMessage(formattedBrl, formattedArs, formattedUsd)}
        </p>

        {/* Resumo do Rombo em Pill Clean */}
        <div className="bank-subtle mt-4 flex items-center justify-between rounded-2xl px-4 py-2.5 text-xs tabular-nums">
          <div className="text-left">
            <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Compra simulada
            </div>
            <div className="text-sm font-extrabold text-[var(--text-primary)]">
              R$ {formattedBrl}
            </div>
          </div>

          <div className="h-7 w-px bg-[var(--border-subtle)]" />

          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Total no Cartão
            </div>
            <div className="text-sm font-extrabold text-rose-500">
              $ {formattedArs} ARS
            </div>
          </div>
        </div>

        {/* Botões Modernos: Aceitar (Primário) + Me Arrependi / Reduzir */}
        <div className="mt-5 space-y-2">
          <button
            type="submit"
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6D55F7] to-[#4E67F5] px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            <span>{activeTemplate.acceptLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleRepentAndLower()}
            className="bank-subtle flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-[0.98] transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Me arrependi — voltar pra R$ 100</span>
          </button>
        </div>
      </form>
    </dialog>
  );
};

/**
 * Ilustração Vetorial 3D Moderna (Cartão + Moedas Voando + Selo 3D de Negação)
 */
const ThreeDCardAlertIllustration: React.FC = () => (
  <svg
    viewBox="0 0 140 140"
    className="relative z-10 h-28 w-28 overflow-visible"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      {/* Sombra 3D suave */}
      <filter id="cardShadow3D" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow
          dx="0"
          dy="10"
          stdDeviation="8"
          floodColor="#1E1B4B"
          floodOpacity="0.28"
        />
      </filter>
      <filter id="badgeShadow3D" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow
          dx="0"
          dy="6"
          stdDeviation="5"
          floodColor="#E11D48"
          floodOpacity="0.38"
        />
      </filter>

      {/* Gradiente 3D do Cartão Violeta/Azul */}
      <linearGradient id="cardBody3D" x1="18" y1="36" x2="112" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="52%" stopColor="#5866F5" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>

      {/* Borda Especular 3D do Cartão */}
      <linearGradient id="cardRim3D" x1="20" y1="36" x2="110" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.12" />
      </linearGradient>

      {/* Moeda Dourada 3D */}
      <radialGradient id="goldCoin3D" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="48%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#D97706" />
      </radialGradient>

      {/* Esfera 3D Coral/Vermelha de Negação */}
      <radialGradient id="denySphere3D" cx="32%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#FDA4AF" />
        <stop offset="38%" stopColor="#F43F5E" />
        <stop offset="100%" stopColor="#BE123C" />
      </radialGradient>
    </defs>

    {/* Sombra elíptica no chão para efeito de flutuação 3D */}
    <ellipse cx="70" cy="122" rx="38" ry="6" fill="#5664F5" fillOpacity="0.18" />

    {/* Moeda 3D Flutuando à Esquerda (Dinheiro indo embora!) */}
    <g className="david-3d-coin-float">
      {/* Asinha branca estilizada */}
      <path
        d="M24 34C15 29 10 35 16 41C11 43 13 49 21 47L28 43Z"
        fill="#E2E8F0"
      />
      <circle cx="33" cy="40" r="13" fill="#B45309" />
      <circle cx="33" cy="38" r="13" fill="url(#goldCoin3D)" />
      <circle
        cx="33"
        cy="38"
        r="9.5"
        stroke="#FEF9C3"
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
      <text
        x="33"
        y="42"
        textAnchor="middle"
        fill="#92400E"
        fontSize="11"
        fontWeight="900"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        $
      </text>
    </g>

    {/* Moeda 3D Menor Flutuando no Topo Direito */}
    <g className="david-3d-coin-float">
      <path
        d="M116 26C124 22 128 27 123 32C127 34 125 39 118 37L112 34Z"
        fill="#E2E8F0"
      />
      <circle cx="107" cy="31" r="9.5" fill="#B45309" />
      <circle cx="107" cy="29.5" r="9.5" fill="url(#goldCoin3D)" />
      <text
        x="107"
        y="33"
        textAnchor="middle"
        fill="#92400E"
        fontSize="8.5"
        fontWeight="900"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        $
      </text>
    </g>

    {/* Cartão Bancário 3D Inclinado */}
    <g filter="url(#cardShadow3D)" transform="rotate(-8 68 74)">
      {/* Espessura extrudada 3D inferior */}
      <rect x="20" y="47" width="92" height="58" rx="15" fill="#312E81" fillOpacity="0.65" />
      {/* Face superior 3D */}
      <rect
        x="20"
        y="43"
        width="92"
        height="58"
        rx="15"
        fill="url(#cardBody3D)"
        stroke="url(#cardRim3D)"
        strokeWidth="2"
      />
      {/* Brilho diagonal glossy */}
      <path
        d="M34 44H74L54 100H26C22.5 100 21 97 21 93V56C21 48 26 44 34 44Z"
        fill="#FFFFFF"
        fillOpacity="0.14"
      />
      {/* Chip Dourado 3D */}
      <rect x="31" y="56" width="16" height="12" rx="3.5" fill="url(#goldCoin3D)" />
      {/* Linhas do cartão */}
      <rect x="31" y="77" width="38" height="5" rx="2.5" fill="#FFFFFF" fillOpacity="0.78" />
      <rect x="31" y="86" width="22" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.45" />
      {/* Círculos da bandeira */}
      <circle cx="88" cy="85" r="7" fill="#FFFFFF" fillOpacity="0.82" />
      <circle cx="96" cy="85" r="7" fill="#FFFFFF" fillOpacity="0.45" />
    </g>

    {/* Selo Esférico 3D de Negação / Alerta ("NÃO / PARE!") */}
    <g filter="url(#badgeShadow3D)">
      {/* Base 3D escura */}
      <circle cx="98" cy="91" r="21" fill="#881337" />
      {/* Esfera Glossy */}
      <circle
        cx="98"
        cy="88"
        r="21"
        fill="url(#denySphere3D)"
        stroke="#FFE4E6"
        strokeOpacity="0.7"
        strokeWidth="2"
      />
      {/* Reflexo superior tipo vidro */}
      <ellipse
        cx="91"
        cy="78"
        rx="8"
        ry="4.5"
        transform="rotate(-22 91 78)"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />
      {/* Ícone X 3D arredondado de negação */}
      <path
        d="M91 81L105 95M105 81L91 95"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </g>
  </svg>
);
