"use client";

import { Moon, SunDim } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { cn } from "../lib/utils";

type props = {
  className?: string;
  isDarkMode?: boolean;
  onToggle?: (isDark: boolean) => void;
};

export const AnimatedThemeToggler = ({ className, isDarkMode: externalIsDarkMode, onToggle }: props) => {
  // Initialize internal state based on current document class
  const [internalIsDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const isDarkMode = externalIsDarkMode !== undefined ? externalIsDarkMode : internalIsDarkMode;
  
  // Sync internal state with external state
  useEffect(() => {
    if (externalIsDarkMode !== undefined) {
      setIsDarkMode(externalIsDarkMode);
    }
  }, [externalIsDarkMode]);
  
  // Initialize theme on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      if (externalIsDarkMode === undefined) {
        setIsDarkMode(isDark);
      }
    }
  }, [externalIsDarkMode]);
  
  const changeTheme = async () => {
    if (!buttonRef.current) return;

    const newDarkMode = !isDarkMode;

    await document.startViewTransition(() => {
      flushSync(() => {
        // Toggle the dark class on document element
        document.documentElement.classList.toggle("dark");
        
        // Update state
        if (externalIsDarkMode !== undefined) {
          // External state management
          onToggle?.(newDarkMode);
        } else {
          // Internal state management
          setIsDarkMode(newDarkMode);
        }
      });
    }).ready;

    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const y = top + height / 2;
    const x = left + width / 2;

    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRad}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  };
  
  return (
    <button ref={buttonRef} onClick={changeTheme} className={cn(className)}>
      <span className="docs-toggle__circle" />
      <span className="docs-toggle__track-icons">
        <SunDim className="docs-toggle__sun" size={16} />
        <Moon className="docs-toggle__moon" size={16} />
      </span>
    </button>
  );
};
