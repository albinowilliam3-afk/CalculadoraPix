import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { PixDiamondIcon } from './ProviderAvatar';
import { attachDialogFallbacks, closeTopLayerDialog } from '../lib/topLayerDialog';

interface PixCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToBrl: () => void;
  currentCurrency: 'USD' | 'EUR';
}

export const PixCurrencyModal: React.FC<PixCurrencyModalProps> = ({
  isOpen,
  onClose,
  onSwitchToBrl,
  currentCurrency,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const handleConfirmSwitch = async () => {
    await closeTopLayerDialog(dialogRef.current);
    onSwitchToBrl();
  };

  const currencyName = currentCurrency === 'EUR' ? 'Euro (€)' : 'Dólar (US$)';

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="pix-currency-modal-title"
      onClose={onClose}
      className="app-alert-modal"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          void handleRequestClose();
        }}
        className="relative overflow-hidden p-5 sm:p-6 text-center"
      >
        <button
          type="button"
          onClick={() => void handleRequestClose()}
          aria-label="Fechar aviso"
          className="bank-subtle absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Ícone Moderno Esmeralda Pix */}
        <div className="mx-auto mt-2 mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10">
          <PixDiamondIcon className="h-8 w-8" />
        </div>

        {/* Tag informando a regra */}
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Sparkles className="h-3 w-3" />
          <span>Pix exclusivo em Reais</span>
        </div>

        <h3
          id="pix-currency-modal-title"
          className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--text-primary)]"
        >
          Pix disponível apenas em Reais (R$)
        </h3>

        <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-[var(--text-secondary)]">
          Você está simulando em <strong>{currencyName}</strong>. Como o sistema Pix opera exclusivamente com saldo em Reais do Banco Central, para usar a Transferência Pix basta alternar a moeda para <strong>R$ Reais</strong>.
        </p>

        {/* Botões de Ação */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => void handleConfirmSwitch()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 active:scale-95 transition"
          >
            <span>Trocar para Reais e usar Pix</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => void handleRequestClose()}
            className="bank-subtle w-full rounded-2xl px-4 py-2.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
          >
            Continuar no Cartão ({currencyName})
          </button>
        </div>
      </form>
    </dialog>
  );
};
