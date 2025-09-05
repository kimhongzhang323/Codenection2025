import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

export interface AtSignIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface AtSignIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const AtSignIcon = forwardRef<AtSignIconHandle, AtSignIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => {
          // Simple animation without motion library
          const element = document.querySelector('.at-sign-icon');
          if (element) {
            element.classList.add('animate');
            setTimeout(() => element.classList.remove('animate'), 600);
          }
        },
        stopAnimation: () => {
          const element = document.querySelector('.at-sign-icon');
          if (element) {
            element.classList.remove('animate');
          }
        },
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          const element = e.currentTarget;
          element.classList.add('animate');
        }
        onMouseEnter?.(e);
      },
      [onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          const element = e.currentTarget;
          element.classList.remove('animate');
        }
        onMouseLeave?.(e);
      },
      [onMouseLeave]
    );

    return (
      <div
        className={`at-sign-icon ${className || ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          <circle
            className="at-circle"
            cx="12"
            cy="12"
            r="4"
          />
          <path
            className="at-path"
            d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"
          />
        </svg>
      </div>
    );
  }
);

AtSignIcon.displayName = 'AtSignIcon';

export { AtSignIcon };
