import React, { useEffect, useState } from 'react';

interface ProviderAvatarProps {
  src: string;
  name: string;
  sizeClass?: string;
}

export const ProviderAvatar: React.FC<ProviderAvatarProps> = ({
  src,
  name,
  sizeClass = 'h-6 w-6',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = name
    .replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#5664F5]/15 text-[10px] font-extrabold text-[var(--brand-primary)] ${sizeClass}`}
      >
        {initials || '$'}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-full object-contain ${sizeClass}`}
    />
  );
};

/**
 * Ícone geométrico moderno estilo símbolo do Pix
 */
export const PixDiamondIcon: React.FC<{ className?: string }> = ({ className }) => (
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
