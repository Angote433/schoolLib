import { forwardRef } from 'react';
import { tokens, getStatusColor } from '../styles/tokens';

// ── SHARED UI COMPONENTS ─────────────────────────────────────────────
// Reusable building blocks used across every page — Modal, FormField,
// Button, Input, Select, StatusBadge, EmptyState, Card, PageHeader,
// Banner. Built on the design tokens in styles/tokens.js so every page
// that uses these automatically stays visually consistent.

// ── MODAL ─────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div style={modalStyles.backdrop} onClick={onClose}>
      <div
        style={{ ...modalStyles.box, maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>{title}</h3>
          <button
            style={modalStyles.closeBtn}
            onClick={onClose}
            onMouseEnter={e => e.currentTarget.style.background = tokens.colors.surface}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div style={modalStyles.body}>{children}</div>
      </div>
    </div>
  );
}

export function ModalFooter({ children }) {
  return <div style={modalStyles.footer}>{children}</div>;
}

const modalStyles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(15,23,42,0.5)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  box: {
    background: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    width: '100%',
    maxHeight: '90vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: tokens.shadows.xl,
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '20px 24px',
    borderBottom: `1px solid ${tokens.colors.border}`,
  },
  title: {
    margin: 0, fontSize: tokens.font.size.section,
    fontWeight: tokens.font.weight.heading, color: tokens.colors.textPrimary,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'transparent', border: 'none',
    fontSize: 15, cursor: 'pointer', color: tokens.colors.textMuted,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: tokens.transition,
  },
  body: { padding: '20px 24px', overflowY: 'auto', maxHeight: '65vh' },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '16px 24px', borderTop: `1px solid ${tokens.colors.border}`,
  },
};

// ── FORM FIELD ────────────────────────────────────────────────────────
export function FormField({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={fieldStyles.label}>{label}</label>}
      {children}
      {hint && !error && <span style={fieldStyles.hint}>{hint}</span>}
      {error && <span style={fieldStyles.error}>{error}</span>}
    </div>
  );
}

const fieldStyles = {
  label: {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: tokens.colors.textSecondary, marginBottom: 6,
  },
  hint: {
    fontSize: 11, color: tokens.colors.textMuted,
    marginTop: 4, display: 'block', lineHeight: 1.5,
  },
  error: {
    fontSize: 11, color: tokens.colors.danger,
    marginTop: 4, display: 'block', lineHeight: 1.5,
  },
};

// ── INPUT / SELECT / TEXTAREA ────────────────────────────────────────
const baseFieldStyle = {
  width: '100%',
  height: 40,
  padding: '9px 14px',
  border: `1.5px solid ${tokens.colors.border}`,
  borderRadius: tokens.radius.sm,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: tokens.font.family,
  color: tokens.colors.textPrimary,
  background: tokens.colors.card,
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

function focusHandlers(onFocus, onBlur) {
  return {
    onFocus: e => {
      e.target.style.borderColor = tokens.colors.borderFocus;
      e.target.style.boxShadow = `0 0 0 3px rgba(27,43,75,0.12)`;
      onFocus?.(e);
    },
    onBlur: e => {
      e.target.style.borderColor = tokens.colors.border;
      e.target.style.boxShadow = 'none';
      onBlur?.(e);
    },
  };
}

export const Input = forwardRef(function Input({ style, onFocus, onBlur, ...props }, ref) {
  return (
    <input
      ref={ref}
      style={{ ...baseFieldStyle, ...style }}
      {...focusHandlers(onFocus, onBlur)}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ style, onFocus, onBlur, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      style={{ ...baseFieldStyle, cursor: 'pointer', ...style }}
      {...focusHandlers(onFocus, onBlur)}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ style, onFocus, onBlur, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      style={{
        ...baseFieldStyle, height: 'auto', resize: 'vertical',
        lineHeight: 1.5, ...style,
      }}
      {...focusHandlers(onFocus, onBlur)}
      {...props}
    />
  );
});

// ── BUTTONS ───────────────────────────────────────────────────────────
const buttonBase = {
  border: 'none',
  borderRadius: tokens.radius.sm,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: tokens.font.weight.button,
  cursor: 'pointer',
  fontFamily: tokens.font.family,
  transition: tokens.transition,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
};

const buttonVariants = {
  primary: {
    background: tokens.colors.primary,
    color: tokens.colors.textInverse,
  },
  accent: {
    background: tokens.colors.accent,
    color: tokens.colors.textInverse,
  },
  secondary: {
    background: tokens.colors.surface,
    color: tokens.colors.textPrimary,
    border: `1.5px solid ${tokens.colors.border}`,
  },
  danger: {
    background: tokens.colors.dangerLight,
    color: tokens.colors.danger,
    border: `1.5px solid ${tokens.colors.dangerBorder}`,
  },
  success: {
    background: tokens.colors.successLight,
    color: tokens.colors.success,
    border: `1.5px solid ${tokens.colors.successBorder}`,
  },
};

const buttonHoverVariants = {
  primary: { background: tokens.colors.primaryLight, transform: 'translateY(-1px)', boxShadow: tokens.shadows.md },
  accent: { background: tokens.colors.accentDark, transform: 'translateY(-1px)', boxShadow: tokens.shadows.md },
  secondary: { borderColor: tokens.colors.primary, background: tokens.colors.card },
  danger: { background: tokens.colors.danger, color: tokens.colors.textInverse },
  success: { background: tokens.colors.success, color: tokens.colors.textInverse },
};

export function Button({
  variant = 'primary', size = 'md', disabled, style,
  onMouseEnter, onMouseLeave, children, ...props
}) {
  const sizeStyle = size === 'sm'
    ? { padding: '6px 14px', fontSize: 12, height: 32 }
    : size === 'lg'
    ? { padding: '13px 26px', fontSize: 15, height: 48 }
    : {};

  return (
    <button
      disabled={disabled}
      style={{
        ...buttonBase,
        ...buttonVariants[variant],
        ...sizeStyle,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled) Object.assign(e.currentTarget.style, buttonHoverVariants[variant]);
        onMouseEnter?.(e);
      }}
      onMouseLeave={e => {
        if (!disabled) {
          Object.assign(e.currentTarget.style, buttonVariants[variant]);
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }
        onMouseLeave?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

// ── STATUS BADGE ──────────────────────────────────────────────────────
export function StatusBadge({ status, label }) {
  const c = getStatusColor(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: tokens.radius.full,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>
      {label || status}
    </span>
  );
}

// ── CARD ──────────────────────────────────────────────────────────────
export function Card({ children, style, hoverable, onClick }) {
  return (
    <div
      style={{
        background: tokens.colors.card,
        border: `1px solid ${tokens.colors.border}`,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.lg,
        boxShadow: tokens.shadows.sm,
        transition: tokens.transition,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={hoverable ? e => {
        e.currentTarget.style.boxShadow = tokens.shadows.md;
        e.currentTarget.style.borderColor = tokens.colors.borderStrong;
      } : undefined}
      onMouseLeave={hoverable ? e => {
        e.currentTarget.style.boxShadow = tokens.shadows.sm;
        e.currentTarget.style.borderColor = tokens.colors.border;
      } : undefined}
    >
      {children}
    </div>
  );
}

// ── PAGE HEADER ───────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', marginBottom: tokens.spacing.lg,
      flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <h1 style={{
          margin: 0, fontSize: tokens.font.size.pageTitle,
          fontWeight: tokens.font.weight.heading, color: tokens.colors.textPrimary,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '4px 0 0', color: tokens.colors.textSecondary, fontSize: 14 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

// ── BANNER (success / error inline messages) ─────────────────────────
export function Banner({ type = 'success', children }) {
  const map = {
    success: { bg: tokens.colors.successLight, border: tokens.colors.successBorder, color: tokens.colors.success, icon: '✅' },
    error: { bg: tokens.colors.dangerLight, border: tokens.colors.dangerBorder, color: tokens.colors.danger, icon: '⚠️' },
    info: { bg: tokens.colors.infoLight, border: tokens.colors.infoBorder, color: tokens.colors.info, icon: 'ℹ️' },
    warning: { bg: tokens.colors.warningLight, border: tokens.colors.warningBorder, color: tokens.colors.warning, icon: '⚠️' },
  };
  const c = map[type];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: tokens.radius.sm, padding: '12px 16px',
      color: c.color, fontSize: 13, marginBottom: tokens.spacing.md,
      display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.5,
    }}>
      <span>{c.icon}</span>
      <span>{children}</span>
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div style={{
      background: tokens.colors.card, borderRadius: tokens.radius.lg,
      padding: 60, textAlign: 'center',
      boxShadow: tokens.shadows.sm, border: `1px solid ${tokens.colors.border}`,
    }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <div style={{
        fontSize: 17, fontWeight: 700,
        color: tokens.colors.textPrimary, marginBottom: 6,
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ color: tokens.colors.textMuted, fontSize: 14, marginBottom: action ? 16 : 0 }}>
          {subtitle}
        </div>
      )}
      {action}
    </div>
  );
}

// ── TABS (pill or full-width variants) ───────────────────────────────
export function Tabs({ items, active, onChange, variant = 'card' }) {
  if (variant === 'pill') {
    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: tokens.spacing.md, flexWrap: 'wrap' }}>
        {items.map(item => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              style={{
                padding: '8px 18px', borderRadius: tokens.radius.full,
                border: `1.5px solid ${isActive ? tokens.colors.primary : tokens.colors.border}`,
                background: isActive ? tokens.colors.primary : tokens.colors.card,
                color: isActive ? tokens.colors.textInverse : tokens.colors.textSecondary,
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', fontFamily: tokens.font.family,
                transition: tokens.transition,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div style={{
        display: 'flex', background: tokens.colors.card,
        borderRadius: tokens.radius.md, padding: 4,
        marginBottom: tokens.spacing.md, boxShadow: tokens.shadows.sm,
        border: `1px solid ${tokens.colors.border}`,
      }}>
        {items.map(item => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              style={{
                flex: 1, padding: '11px 16px', borderRadius: tokens.radius.sm,
                border: 'none', cursor: 'pointer',
                background: isActive ? tokens.colors.primary : 'transparent',
                color: isActive ? tokens.colors.textInverse : tokens.colors.textSecondary,
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                fontFamily: tokens.font.family, transition: tokens.transition,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  // default 'card' variant — used by Users/Losses-style tabs with descriptions
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: tokens.spacing.md, flexWrap: 'wrap' }}>
      {items.map(item => {
        const isActive = active === item.key;
        return (
          <div
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              padding: '12px 20px', background: isActive ? tokens.colors.primary : tokens.colors.card,
              borderRadius: tokens.radius.md, border: `2px solid ${isActive ? tokens.colors.primary : 'transparent'}`,
              cursor: 'pointer', flex: 1, minWidth: 150,
              boxShadow: tokens.shadows.sm, transition: tokens.transition,
            }}
          >
            <div style={{
              fontSize: 14, fontWeight: 700, marginBottom: 2,
              color: isActive ? tokens.colors.textInverse : tokens.colors.textPrimary,
            }}>
              {item.label}
            </div>
            {item.desc && (
              <div style={{
                fontSize: 11,
                color: isActive ? 'rgba(255,255,255,0.65)' : tokens.colors.textMuted,
              }}>
                {item.desc}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── AVATAR ────────────────────────────────────────────────────────────
export function Avatar({ name, size = 40, background }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: background || tokens.colors.primary,
      color: tokens.colors.textInverse,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.42, flexShrink: 0,
    }}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}
