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
