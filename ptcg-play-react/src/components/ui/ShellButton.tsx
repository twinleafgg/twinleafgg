import { cn } from '../../utils/cn';
import { playSfx } from '../../sfx';
import styles from './ShellButton.module.css';

export type ShellButtonVariant = 'primary' | 'secondary' | 'plain' | 'ghost';

const variantClass: Record<ShellButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  plain: styles.plain,
  ghost: styles.ghost,
};

export type ShellButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ShellButtonVariant;
  /** Disable button SFX. */
  silent?: boolean;
};

export function ShellButton({
  variant = 'primary',
  className,
  type = 'button',
  silent = false,
  onClick,
  disabled,
  ...props
}: ShellButtonProps) {
  return (
    <button
      type={type}
      className={cn(styles.base, variantClass[variant], className)}
      disabled={disabled}
      onClick={(e) => {
        if (!silent && !disabled) {
          playSfx('uiButton');
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
}
