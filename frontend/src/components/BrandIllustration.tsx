import Image from 'next/image';

interface BrandIllustrationProps {
  kind?: 'mascot' | 'wallet' | 'receipt' | 'chart';
  className?: string;
  size?: number;
  priority?: boolean;
}

export default function BrandIllustration({
  kind = 'mascot',
  className = '',
  size = 200,
  priority = false,
}: BrandIllustrationProps) {
  return (
    <Image
      src={`/brand/glass/${kind}.webp`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      className={`brand-illustration ${className}`}
    />
  );
}
