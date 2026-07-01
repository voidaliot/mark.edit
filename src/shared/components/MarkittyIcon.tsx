type MarkittyIconProps = {
  size?: number;
};

export function MarkittyIcon({ size = 22 }: MarkittyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Markitty"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 25.5V16.5C18 15.2 19.4 14.4 20.5 15.1L28.4 20.1C30.8 19.5 33.2 19.5 35.6 20.1L43.5 15.1C44.6 14.4 46 15.2 46 16.5V25.5C48.4 28.5 49.4 32.3 48.8 36.1C47.8 43.4 40.9 48 32 48C23.1 48 16.2 43.4 15.2 36.1C14.6 32.3 15.6 28.5 18 25.5Z"
        stroke="currentColor"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25.2 34.2H25.25M38.75 34.2H38.8"
        stroke="currentColor"
        strokeWidth="5.2"
        strokeLinecap="round"
      />
      <path
        d="M29.2 40.3C31.1 42 32.9 42 34.8 40.3"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
