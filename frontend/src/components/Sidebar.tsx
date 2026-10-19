import { Icon } from './Icon'

export type PageName = 'dashboard' | 'weather' | 'quality' | 'pipeline'

const navItems: { id: PageName; label: string; icon: 'grid' | 'table' | 'shield' | 'flow' }[] = [
  { id: 'dashboard', label: '대시보드 홈', icon: 'grid' },
  { id: 'weather', label: '기상 데이터 조회', icon: 'table' },
  { id: 'quality', label: '데이터 품질 관리', icon: 'shield' },
  { id: 'pipeline', label: '파이프라인 모니터링', icon: 'flow' },
]

export function Sidebar({ page, onChange }: { page: PageName; onChange: (page: PageName) => void }) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark"><Icon name="cloud" size={20} /></span><span>KMA DATA</span></div>
    <p className="brand-subtitle">WEATHER PLATFORM</p>
    <nav aria-label="주요 메뉴">
      {navItems.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => onChange(item.id)}>
        <Icon name={item.icon} /><span>{item.label}</span>
      </button>)}
    </nav>
    
  </aside>
}
