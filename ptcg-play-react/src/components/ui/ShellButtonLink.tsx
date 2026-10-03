import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { playSfx } from '../../sfx';
import styles from './ShellButton.module.css';
import type { ShellButtonVariant } from './ShellButton';

const variantClass: Record<ShellButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  plain: styles.plain,
  ghost: styles.ghost,
};

export type ShellButtonLinkProps = LinkProps & {
  variant?: ShellButtonVariant;
  /** Disable button SFX. */
  silent?: boolean;
};

export function ShellButtonLink({
  variant = 'primary',
  className,
  silent = false,
  onClick,
  ...props
}: ShellButtonLinkProps) {
  return (
    <Link
      className={cn(styles.base, variantClass[variant], className)}
      onClick={(e) => {
        if (!silent) {
          playSfx('uiButton');
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
}
