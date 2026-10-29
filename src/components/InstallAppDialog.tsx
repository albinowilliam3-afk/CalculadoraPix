import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Download,
  MoreVertical,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { attachDialogFallbacks, closeTopLayerDialog } from '../lib/topLayerDialog';

interface InstallAppDialogProps {
  isOpen: boolean;
  canTriggerNativeInstall: boolean;
  onTriggerNativeInstall: () => Promise<void>;
  onClose: () => void;
}

export const InstallAppDialog: React.FC<InstallAppDialogProps> = ({
  isOpen,
  canTriggerNativeInstall,
  onTriggerNativeInstall,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isSamsungBrowser = /SamsungBrowser/i.test(ua);

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

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby="install-dialog-title"
      onClose={onClose}
      className="app-sheet"
    >
      <div className="max-h-[88dvh] overflow-y-auto p-5 pb-safe">
        <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[var(--border-subtle)]" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5664F5]/15 text-[var(--brand-primary)]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="install-dialog-title"
                className="text-base font-extrabold text-[var(--text-primary)]"
              >
                Instalar no seu Galaxy / Celular
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Crie um app na tela inicial com funcionamento offline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleRequestClose()}
            aria-label="Fechar guia de instalação"
            className="bank-subtle flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {canTriggerNativeInstall && (
          <div className="mt-4 rounded-2xl bg-[#5664F5]/12 p-4">
            <p className="text-xs font-bold text-[var(--text-primary)]">
              Instalação direta disponível em 1 toque:
            </p>
            <button
              type="button"
              onClick={async () => {
                await onTriggerNativeInstall();
                await handleRequestClose();
              }}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-[#5664F5] font-extrabold text-sm text-white shadow-md shadow-indigo-500/25 active:scale-95 transition"
            >
              <Download className="h-4 w-4" />
              <span>Instalar PesoPix Agora</span>
            </button>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {/* Samsung Galaxy */}
          <div
            className={`rounded-2xl p-4 ${
              !isIOS
                ? 'bg-[#5664F5]/[0.08] ring-1 ring-[#5664F5]/30'
                : 'bank-subtle'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--brand-primary)]">
                📱 Samsung Galaxy (One UI • Chrome / Samsung Internet)
              </h3>
              {!isIOS && (
                <span className="rounded-md bg-[#5664F5] px-2 py-0.5 text-[10px] font-bold text-white">
                  Ideal
                </span>
              )}
            </div>

            {isSamsungBrowser ? (
              <ol className="mt-2.5 space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[var(--brand-primary)]">1.</span>
                  <span>
                    Toque no <strong>Menu (☰)</strong> no canto inferior direito do Samsung
                    Internet.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[var(--brand-primary)]">2.</span>
                  <span>
                    Toque em <strong>&ldquo;Adicionar página a&rdquo; → &ldquo;Tela inicial&rdquo;</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="mt-2.5 space-y-2 text-xs text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[var(--brand-primary)]">1.</span>
                  <span className="inline-flex flex-wrap items-center gap-1">
                    No Chrome do Galaxy, toque nos <strong>3 pontinhos</strong>
                    <MoreVertical className="inline h-3.5 w-3.5 text-[var(--brand-primary)]" /> no
                    topo direito.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-extrabold text-[var(--brand-primary)]">2.</span>
                  <span>
                    Escolha <strong>&ldquo;Adicionar à tela inicial&rdquo;</strong> →{' '}
                    <strong>&ldquo;Instalar&rdquo;</strong> para abrir em tela cheia na One UI!
                  </span>
                </li>
              </ol>
            )}
          </div>

          {/* iPhone */}
          <div
            className={`rounded-2xl p-4 ${
              isIOS
                ? 'bg-[#5664F5]/[0.08] ring-1 ring-[#5664F5]/30'
                : 'bank-subtle'
            }`}
          >
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-primary)]">
              🍏 iPhone (Safari iOS)
            </h3>
            <ol className="mt-2.5 space-y-2 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="font-extrabold text-[var(--brand-primary)]">1.</span>
                <span className="inline-flex flex-wrap items-center gap-1">
                  Toque em <strong>Compartilhar</strong>
                  <Share className="inline h-3.5 w-3.5 text-[var(--brand-primary)]" /> na barra
                  inferior.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-extrabold text-[var(--brand-primary)]">2.</span>
                <span>
                  Selecione <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
                </span>
              </li>
            </ol>
          </div>

          <div className="bank-subtle flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs text-[var(--text-secondary)]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              Últimas cotações ficam salvas no aparelho caso fique sem internet na loja.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleRequestClose()}
          className="bank-subtle mt-4 min-h-[48px] w-full rounded-2xl font-bold text-sm text-[var(--text-primary)] transition"
        >
          Entendi
        </button>
      </div>
    </dialog>
  );
};
