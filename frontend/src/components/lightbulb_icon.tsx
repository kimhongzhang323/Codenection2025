import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '../lib/utils';

interface LightbulbIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LightbulbIcon = forwardRef<HTMLDivElement, LightbulbIconProps>(
  ({ className, size = 18, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(className)}
        {...props}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"/>
          <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
        </svg>
      </div>
    );
  }
);

LightbulbIcon.displayName = 'LightbulbIcon';

export { LightbulbIcon };
