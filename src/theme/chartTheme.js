/**
 * Single source of truth for Recharts styling across admin analytics.
 * Keeps dashboards aligned with Nexus brand (forest / teal / ink).
 */
export const NEXUS_CHART_COLORS = [
  '#15803d',
  '#0d9488',
  '#0369a1',
  '#ca8a04',
  '#c2410c',
  '#64748b',
];

export const nexusTooltipProps = {
  contentStyle: {
    backgroundColor: 'var(--surface-bg)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '14px',
    boxShadow: '0 16px 48px var(--shadow-elevated)',
    padding: '10px 14px',
  },
  labelStyle: {
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontFamily: 'Instrument Sans, ui-sans-serif, system-ui, sans-serif',
    fontSize: 13,
  },
  itemStyle: {
    color: 'var(--text-secondary)',
    fontFamily: 'Instrument Sans, ui-sans-serif, system-ui, sans-serif',
    fontSize: 12,
  },
};
