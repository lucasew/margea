interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 32 }: LogoProps) {
  return (
    <img
      src="/logo.svg"
      alt="Margea"
      width={size}
      height={size}
      className={className}
    />
  );
}
