
import { useEffect, useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Icon } from './Icon'
import {
  formatMetric,
  formatTime,
  toNumber,
  WeatherObservation,
  WeatherResponse,
} from '../lib/weather'
import { formatSourceLine } from '../lib/source'
import { weatherApi } from '../lib/weatherApi'

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()

type Props = {
  data: WeatherObservation[]
  setData: (data: WeatherObservation[]) => void
  setQueryDate: (date: string) => void
  queryDate: string
  observedAt: string
  setObservedAt: (value: string) => void
  openWeather: () => void
  openPipeline: () => void
}

type QualityResponse = {
  query_date: string
  count: number
  status: 'PASS' | 'FAIL' | 'NO_DATA'
  report: {
    total_count: number
    missing_count: number
    duplicate_count: number
    time_order_error: boolean
    time_interval_error: boolean
    range_errors: Record<string, string>
    status: 'PASS' | 'FAIL'
  } | null
}

type PipelineResponse = {
  status: string
  runs: {
    state: string
    start_date: string | null
    logical_date: string | null
  }[]
}

export function Dashboard({
  data,
  setData,
  setQueryDate,
  queryDate,
  observedAt,
  setObservedAt,
  openWeather,
  openPipeline,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qualityStatus, setQualityStatus] =
    useState<QualityResponse | null>(null)
  const [pipelineStatus, setPipelineStatus] =
    useState<PipelineResponse | null>(null)

  useEffect(() => {
    if (data.length) return

    const loadLatest = async () => {
      setLoading(true)

      try {
        const result = await weatherApi<WeatherResponse>('/api/weather')
        const items = Array.isArray(result.data) ? result.data : []

        setData(items)
        setQueryDate(result.query_date || '')
        setObservedAt(
          new Date().toLocaleString('sv-SE', {
            timeZone: 'Asia/Seoul',
          }) + ' KST',
        )
      } catch {
        setError('최신 관측 데이터를 아직 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    void loadLatest()
  }, [data.length, setData, setQueryDate, setObservedAt])

  useEffect(() => {
    const loadQuality = async () => {
      try {
        const result = await weatherApi<QualityResponse>(
          '/api/quality?date=2026-09-15',
        )
        setQualityStatus(result)
      } catch {
        setQualityStatus(null)
      }
    }

    void loadQuality()
  }, [])

  useEffect(() => {
    const loadPipeline = async () => {
      try {
        const result =
          await weatherApi<PipelineResponse>('/api/pipeline/runs')
        setPipelineStatus(result)
      } catch {
        setPipelineStatus(null)
      }
    }

    void loadPipeline()
  }, [])

  const latestRun = pipelineStatus?.runs?.[0]
  const latestState = latestRun?.state?.toLowerCase()

  const pipelineLabel =
    latestState === 'success'
      ? '성공'
      : latestState === 'failed'
        ? '실패'
        : latestState === 'running'
          ? '실행 중'
          : latestState === 'queued'
            ? '대기 중'
            : '상태 확인 불가'

  const latestDate =
    latestRun?.start_date || latestRun?.logical_date

  const formattedRunDate = latestDate
    ? new Date(latestDate).toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul',
      })
    : '실행 기록 없음'

  const latest = data[data.length - 1]

  const chartData = useMemo(
    () =>
      data
        .map((item) => ({
          time: formatTime(item.tm),
          temperature: toNumber(item.ta),
          humidity: toNumber(item.hm),
        }))
        .filter(
          (item) =>
            item.temperature !== null || item.humidity !== null,
        ),
    [data],
  )

  const chartColors = {
    temperature: cssVar('--chart-1'),
    humidity: cssVar('--chart-2'),
    grid: cssVar('--grid-line'),
    muted: cssVar('--muted'),
  }

  const sourceLabel = queryDate
    ? `${queryDate} 조회 결과`
    : '최신 24건 조회 결과'

  return (
    <section className="page-content">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">DATA OPERATIONS OVERVIEW</p>
          <h1>대시보드 홈</h1>
          <p>
            기상청 ASOS 관측 데이터의 적재 현황과 최근 지표를 확인합니다.
          </p>
        </div>

        <button className="quiet-button" onClick={openWeather}>
          <Icon name="table" />
          날짜별 조회
        </button>
      </div>

      <div className="source-row">
        <span
          className={`status-dot ${data.length ? 'success' : 'muted'}`}
        />
        {loading
          ? '최신 데이터 확인 중'
          : data.length
            ? formatSourceLine(observedAt || latest?.tm)
            : error || '데이터 연결 대기 중'}
      </div>

      <div className="metric-grid">
        <Metric
          label="최신 관측 시각"
          value={latest ? latest.tm.replace('T', ' ') : '—'}
          sub="API 응답 기준"
          wide
        />
        <Metric
          label="조회 데이터 건수"
          value={data.length ? `${data.length}건` : '—'}
          sub={sourceLabel}
        />
        <Metric
          label="최신 기온"
          value={formatMetric(latest?.ta, '°C')}
          sub="ta"
        />
        <Metric
          label="최신 습도"
          value={formatMetric(latest?.hm, '%')}
          sub="hm"
        />
        <Metric
          label="최신 풍속"
          value={formatMetric(latest?.ws, ' m/s')}
          sub="ws"
        />
      </div>

      <div className="chart-grid">
        <ChartCard
          title="시간별 기온 변화"
          subtitle="ta · °C"
          data={chartData}
          dataKey="temperature"
          color={chartColors.temperature}
          grid={chartColors.grid}
          muted={chartColors.muted}
          empty={!chartData.length}
        />
        <ChartCard
          title="시간별 습도 변화"
          subtitle="hm · %"
          data={chartData}
          dataKey="humidity"
          color={chartColors.humidity}
          grid={chartColors.grid}
          muted={chartColors.muted}
          empty={!chartData.length}
        />
      </div>

      <section className="card preview-card">
        <div className="section-header">
          <div>
            <h2>최근 수집 데이터</h2>
            <p>{sourceLabel}</p>
          </div>
          <button className="text-button" onClick={openWeather}>
            전체 보기 →
          </button>
        </div>

        {data.length ? (
          <div className="preview-list">
            {data
              .slice(-5)
              .reverse()
              .map((item, index) => (
                <div
                  className="preview-row"
                  key={`${item.tm}-${index}`}
                >
                  <span className="tabular strong">
                    {formatTime(item.tm)}
                  </span>
                  <span>
                    기온{' '}
                    <b className="tabular">
                      {formatMetric(item.ta, '°C')}
                    </b>
                  </span>
                  <span>
                    습도{' '}
                    <b className="tabular">
                      {formatMetric(item.hm, '%')}
                    </b>
                  </span>
                  <span>
                    풍속{' '}
                    <b className="tabular">
                      {formatMetric(item.ws, ' m/s')}
                    </b>
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="state-panel">
            {loading
              ? '최신 데이터를 불러오고 있습니다.'
              : '표시할 최신 데이터가 없습니다.'}
          </div>
        )}
      </section>

      <section className="notice-grid">
        <InfoNotice
          title="데이터 품질 검증"
          text={
            qualityStatus
              ? `검증 결과: ${qualityStatus.status} · 전체 ${qualityStatus.count}건`
              : '품질 검증 결과를 불러올 수 없습니다.'
          }
        />

        <button
          type="button"
          className="notice-card notice-card-button"
          onClick={openPipeline}
        >
          <span className="notice-icon">
            <Icon name="cloud" />
          </span>
          <div>
            <h3>파이프라인 운영</h3>
            <p><strong>{pipelineLabel}</strong></p>
            <p>최근 실행 · {formattedRunDate}</p>
            <p className="pipeline-card-link">
              최근 실행 이력 보기 →
            </p>
          </div>
        </button>
      </section>
    </section>
  )
}

function Metric({
  label,
  value,
  sub,
  wide = false,
}: {
  label: string
  value: string
  sub: string
  wide?: boolean
}) {
  return (
    <article className={`metric-card ${wide ? 'metric-wide' : ''}`}>
      <p>{label}</p>
      <strong className="tabular">{value}</strong>
      <span>{sub}</span>
    </article>
  )
}

function InfoNotice({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <article className="notice-card">
      <span className="notice-icon">
        <Icon name="cloud" />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  )
}

function ChartCard({
  title,
  subtitle,
  data,
  dataKey,
  color,
  grid,
  muted,
  empty,
}: {
  title: string
  subtitle: string
  data: {
    time: string
    temperature: number | null
    humidity: number | null
  }[]
  dataKey: 'temperature' | 'humidity'
  color: string
  grid: string
  muted: string
  empty: boolean
}) {
  return (
    <section className="card chart-card">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {empty ? (
        <div className="chart-empty">
          실제 관측 데이터가 연결되면 그래프가 표시됩니다.
        </div>
      ) : (
        <div className="chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                stroke={grid}
                strokeDasharray="3 4"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: muted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: muted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: cssVar('--color-surface-2'),
                  border: `1px solid ${cssVar('--color-border')}`,
                  borderRadius: cssVar('--radius-md'),
                }}
                labelStyle={{ color: cssVar('--color-text') }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
