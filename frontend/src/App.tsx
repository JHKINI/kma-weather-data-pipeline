
import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { PendingPage } from './components/PendingPage'
import { PageName, Sidebar } from './components/Sidebar'
import { WeatherPage } from './components/WeatherPage'
import { QualityPage } from './components/QualityPage'
import { WeatherObservation } from './lib/weather'
import { PipelinePage } from './components/PipelinePage'

export default function App() {
  const [page, setPage] = useState<PageName>('weather')
  const [data, setData] = useState<WeatherObservation[]>([])
  const [queryDate, setQueryDate] = useState('')
  const [observedAt, setObservedAt] = useState('')

  const showWeather = () => setPage('weather')

  return (
    <div className="app-shell">
      <Sidebar page={page} onChange={setPage} />

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="topbar-label">KMA WEATHER DATA PLATFORM</span>
            <span className="topbar-separator">/</span>
            <span>ASOS 관측 데이터</span>
          </div>
          
        </header>

{page === 'dashboard' && (
          <Dashboard
            data={data}
            setData={setData}
            setQueryDate={setQueryDate}
            queryDate={queryDate}
            observedAt={observedAt}
            setObservedAt={setObservedAt}
            openWeather={showWeather}
            openPipeline={() => setPage('pipeline')}
          />
        )}

        {page === 'weather' && (
          <WeatherPage
            data={data}
            setData={setData}
            setQueryDate={setQueryDate}
            queryDate={queryDate}
            observedAt={observedAt}
            setObservedAt={setObservedAt}
          />
        )}

        {page === 'quality' && <QualityPage />}

        {page === 'pipeline' && <PipelinePage />}
      </main>
    </div>
  )
}
