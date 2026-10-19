type IconName = 'grid' | 'table' | 'shield' | 'flow' | 'cloud' | 'refresh'

const paths: Record<IconName, React.ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 10v10M15 10v10"/></>,
  shield: <path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Zm-3 9 2 2 4-4"/>,
  flow: <><rect x="3" y="4" width="7" height="5" rx="1"/><rect x="14" y="15" width="7" height="5" rx="1"/><path d="M10 6.5h3a3 3 0 0 1 3 3V15M6.5 9v6a3 3 0 0 0 3 3h4.5"/></>,
  cloud: <path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 8.3 4.9 4.9 0 0 0 7 18Z"/>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.9-3.9L3 9"/><path d="M3 4v5h5M4 13a8 8 0 0 0 14.9 3.9L21 15"/><path d="M21 20v-5h-5"/></>,
}

export function Icon({ name, size = 18 }: { name: IconName, size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
