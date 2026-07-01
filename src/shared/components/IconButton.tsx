import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  pressed?: boolean;
  children: ReactNode;
};

export function IconButton({ label, pressed, children, ...props }: IconButtonProps) {
  return (
    <button
      {...props}
      type="button"
      className={`icon-button ${props.className ?? ''}`.trim()}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      {children}
    </button>
  );
}
