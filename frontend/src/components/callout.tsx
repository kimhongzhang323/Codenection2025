import React from 'react';

export type CalloutVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

interface CalloutProps {
  title?: string;
  variant?: CalloutVariant;
  children?: React.ReactNode;
}

const variantToColors: Record<CalloutVariant, { accent: string; icon: string; border: string; bg: string; text: string; subtext: string; }> = {
  info: {
    accent: '#2563eb',
    icon: '#60a5fa',
    border: 'rgba(148,163,184,0.2)',
    bg: 'rgba(148,163,184,0.06)',
    text: 'var(--docs-header-text)',
    subtext: 'var(--docs-normal-text)'
  },
  success: {
    accent: '#16a34a',
    icon: '#4ade80',
    border: 'rgba(34,197,94,0.25)',
    bg: 'rgba(34,197,94,0.06)',
    text: 'var(--docs-header-text)',
    subtext: 'var(--docs-normal-text)'
  },
  warning: {
    accent: '#d97706',
    icon: '#fbbf24',
    border: 'rgba(245,158,11,0.25)',
    bg: 'rgba(245,158,11,0.06)',
    text: 'var(--docs-header-text)',
    subtext: 'var(--docs-normal-text)'
  },
  error: {
    accent: '#dc2626',
    icon: '#f87171',
    border: 'rgba(239,68,68,0.25)',
    bg: 'rgba(239,68,68,0.06)',
    text: 'var(--docs-header-text)',
    subtext: 'var(--docs-normal-text)'
  },
  neutral: {
    accent: '#6b7280',
    icon: '#9ca3af',
    border: 'rgba(156,163,175,0.25)',
    bg: 'rgba(156,163,175,0.06)',
    text: 'var(--docs-header-text)',
    subtext: 'var(--docs-normal-text)'
  },
};

const InfoIcon: React.FC<{ color: string; inner: string }> = ({ color, inner }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none">
    <circle cx="12" cy="12" r="10" fill={color} />
    <line x1="12" y1="16" x2="12" y2="11.5" stroke={inner} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="8" r="1" fill={inner} />
  </svg>
);

const Callout: React.FC<CalloutProps> = ({ title, variant = 'info', children }) => {
  const colors = variantToColors[variant];
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const containerBg = isDark ? '#1a1a1a' : '#f1f1f1';
  const containerBorder = isDark ? colors.border : 'rgba(0,0,0,0.08)';
  return (
    <div
      className="my-4 rounded-lg overflow-hidden"
      style={{
        backgroundColor: containerBg,
        border: `1px solid ${containerBorder}`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 10,
          top: 15,
          bottom: 15,
          width: 2,
          backgroundColor: colors.accent,
          borderRadius: 9999,
          opacity: 0.95,
          boxShadow: '0 0 0 1px rgba(59,130,246,0.35), 0 0 10px rgba(59,130,246,0.25)'
        }}
      />
      <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', alignItems: 'flex-start', fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 300 }}>
        <div style={{ width: 4 }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ marginTop: 2 }}>
            <InfoIcon color={colors.icon} inner={isDark ? '#1e3a8a' : '#f1f1f1'} />
          </div>
          <div>
            {title ? (
              <div style={{ fontWeight: 400, fontSize: '1.0rem', color: colors.text, marginBottom: 6 }}>{title}</div>
            ) : null}
            <div style={{ fontSize: '0.9rem', color: colors.subtext, lineHeight: 1.6, fontWeight: 300 }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Callout;


