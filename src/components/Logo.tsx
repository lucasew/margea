interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Ocean wave background */}
      <circle cx="50" cy="50" r="48" fill="currentColor" opacity="0.1" />

      {/* Stylized 'M' representing waves/tides */}
      <path
        d="M 20 65 L 20 35 L 35 50 L 50 35 L 65 50 L 80 35 L 80 65"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Bottom wave accent */}
      <path
        d="M 15 75 Q 30 70, 50 75 T 85 75"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
