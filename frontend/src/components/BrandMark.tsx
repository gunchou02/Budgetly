import Image from 'next/image';

interface BrandMarkProps {
  size?: number;
  priority?: boolean;
}

export default function BrandMark({ size = 40, priority = false }: BrandMarkProps) {
  return (
    <Image
      className="brand-mark"
      src="/brand/budgetly-mark.svg"
      alt=""
      width={size}
      height={size}
      priority={priority}
      aria-hidden="true"
    />
  );
}
