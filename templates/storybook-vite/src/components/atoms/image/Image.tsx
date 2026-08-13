export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> { alt: string; }

export function Image({ alt, className = "", ...props }: ImageProps) {
  return <img alt={alt} className={`block h-auto max-w-full rounded-md ${className}`} {...props} />;
}
