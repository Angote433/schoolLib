// ── DESIGN TOKENS ────────────────────────────────────────────────────
// Single source of truth for color, spacing, typography, shadows and
// radius across the entire web app. Import this into every page/
// component instead of hardcoding raw hex values or pixel numbers.

export const tokens = {
  colors: {
    primary: '#1B2B4B',
    primaryLight: '#2D4270',
    primaryDark: '#162038',
    accent: '#0D9488',
    accentLight: '#CCFBF1',
    accentDark: '#0B7A70',
    danger: '#DC2626',
    dangerLight: '#FEF2F2',
    dangerBorder: '#FECACA',
    warning: '#D97706',
    warningLight: '#FFFBEB',
    warningBorder: '#FDE68A',
    success: '#16A34A',
    successLight: '#F0FDF4',
    successBorder: '#BBF7D0',
    info: '#1D4ED8',
    infoLight: '#EFF6FF',
    infoBorder: '#BFDBFE',
    surface: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    borderFocus: '#1B2B4B',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
  },
  shadows: {
    sm: '0 1px 2px rgba(15,23,42,0.06)',
    md: '0 4px 6px rgba(15,23,42,0.07)',
    lg: '0 10px 15px rgba(15,23,42,0.08)',
    xl: '0 20px 25px rgba(15,23,42,0.12)',
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  font: {
    family: "'Inter', 'Segoe UI', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
    size: {
      pageTitle: 24,
      section: 18,
      cardTitle: 15,
      body: 14,
      small: 12,
      tiny: 11,
    },
    weight: {
      body: 400,
      label: 500,
      button: 600,
      heading: 700,
    },
  },
  transition: 'all 0.18s ease',
};

// ── STATUS COLOR MAP ─────────────────────────────────────────────────
// Standardized status badge colors — used across Books, Distributions,
// Borrows, Losses and Students so the same word always means the same
// color everywhere in the app.
export const statusColors = {
  AVAILABLE:    { bg: tokens.colors.successLight, color: tokens.colors.success },
  ACTIVE:       { bg: tokens.colors.successLight, color: tokens.colors.success },
  RESOLVED:     { bg: tokens.colors.successLight, color: tokens.colors.success },
  DISTRIBUTED:  { bg: tokens.colors.warningLight, color: tokens.colors.warning },
  PENDING:      { bg: tokens.colors.warningLight, color: tokens.colors.warning },
  OVERDUE:      { bg: tokens.colors.dangerLight, color: tokens.colors.danger },
  BORROWED:     { bg: tokens.colors.infoLight, color: tokens.colors.info },
  LOST:         { bg: tokens.colors.dangerLight, color: tokens.colors.danger },
  INACTIVE:     { bg: tokens.colors.dangerLight, color: tokens.colors.danger },
  RETURNED:     { bg: tokens.colors.successLight, color: tokens.colors.success },
  WRITTEN_OFF:  { bg: tokens.colors.surface, color: tokens.colors.textMuted },
  DEFAULT:      { bg: tokens.colors.surface, color: tokens.colors.textMuted },
};

export const getStatusColor = (status) =>
  statusColors[status] || statusColors.DEFAULT;

export default tokens;
