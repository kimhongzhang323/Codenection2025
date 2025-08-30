import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';

export interface SquareArrowUpIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SquareArrowUpIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const SquareArrowUpIcon = forwardRef<
  SquareArrowUpIconHandle,
  SquareArrowUpIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
  const isControlledRef = useRef(false);

  useImperativeHandle(ref, () => {
    isControlledRef.current = true;
    return {
      startAnimation: () => {
        // Simple animation without motion library
        const element = document.querySelector('.square-arrow-up-icon');
        if (element) {
          element.classList.add('animate');
          setTimeout(() => element.classList.remove('animate'), 400);
        }
      },
      stopAnimation: () => {
        const element = document.querySelector('.square-arrow-up-icon');
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
      className={`square-arrow-up-icon ${className || ''}`}
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
        <rect
          width="18"
          height="18"
          x="3"
          y="3"
          rx="2"
          className="square-rect"
        />
        <path
          className="arrow-path"
          d="m16 12-4-4-4 4"
        />
        <path
          className="line-path"
          d="M12 16V8"
        />
      </svg>
    </div>
  );
});

SquareArrowUpIcon.displayName = 'SquareArrowUpIcon';

export { SquareArrowUpIcon };
