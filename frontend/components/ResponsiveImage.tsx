import Image, { type ImageProps } from 'next/image';
import type { ProductImage } from '@/lib/types';

type ResponsiveImageProps = Omit<
  ImageProps,
  'src' | 'alt' | 'width' | 'height' | 'fill'
> & {
  src: string;
  alt?: string | null;
  sizes?: string;
  priority?: boolean;
};

export function ResponsiveImage({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  className,
  ...rest
}: ResponsiveImageProps) {
  if (!src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-zinc-200 dark:bg-zinc-700">
        <span className="text-xs text-zinc-500">Không có ảnh</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt ?? ''}
      fill
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      className={className}
      {...rest}
    />
  );
}

export function ProductGallery({
  images,
  alt,
}: {
  images: ProductImage[];
  alt?: string | null;
}) {
  const primary = images[0];
  if (!primary) return null;
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
      <ResponsiveImage
        src={primary.url}
        alt={primary.alt ?? alt}
        sizes="(max-width: 768px) 100vw"
        className="object-cover"
      />
    </div>
  );
}
