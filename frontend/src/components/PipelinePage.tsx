
import { useCallback, useEffect, useState } from 'react'
import { weatherApi } from '../lib/weatherApi'

type PipelineRun = {
  dag_id: string | null
  dag_run_id: string | null
  logical_date: string | null
  state: string | null
  start_date: string | null
  end_date: string | null
}

type PipelineResponse = {
  status: string
  message?: string
  runs: PipelineRun[]
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Date(value).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function stateLabel(state: string | null) {
  switch (state) {
    case 'success':
      return '성공'
    case 'failed':
      return '실패'
    case 'running':
      return '실행 중'
    case 'queued':
      return '대기'
    default:
      return state ?? '알 수 없음'
  }
}

export function PipelinePage() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  const loadRuns = useCallback(async () => {
    try {
      const result = await weatherApi<PipelineResponse>(
        '/api/pipeline/runs',
      )

      if (result.status !== 'OK') {
        throw new Error(
          result.message ?? `Airflow 조회 실패: ${result.status}`,
        )
      }

      setRuns(result.runs)
      setError('')
      setUpdatedAt(new Date().toLocaleTimeString('ko-KR'))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '파이프라인 실행 이력을 불러오지 못했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRuns()

    const timer = window.setInterval(() => {
      void loadRuns()
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [loadRuns])

  const latestRun = runs[0]
  const successCount = runs.filter(
    (run) => run.state === 'success',
  ).length
  const failedCount = runs.filter(
    (run) => run.state === 'failed',
  ).length

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <span className="topbar-label">PIPELINE MONITORING</span>
          <h1>파이프라인 모니터링</h1>
          <p>Airflow 기반 기상 데이터 수집 및 적재 실행 이력</p>
        </div>

        <button
          type="button"
          onClick={() => void loadRuns()}
          disabled={loading}
        >
          {loading ? '조회 중...' : '새로고침'}
        </button>
      </div>

      {error && (
        <div className="card">
          <strong>실행 이력 조회 오류</strong>
          <p>{error}</p>
          <p>Airflow 및 FastAPI 실행 상태를 확인해 주세요.</p>
        </div>
      )}

      <div className="metric-grid">
        <div className="metric-card">
          <span>최근 실행 상태</span>
          <strong>
            {latestRun ? stateLabel(latestRun.state) : '-'}
          </strong>
        </div>

        <div className="metric-card">
          <span>최근 조회 5건 중 성공</span>
          <strong>{successCount}</strong>
        </div>

        <div className="metric-card">
          <span>최근 조회 5건 중 실패</span>
          <strong>{failedCount}</strong>
        </div>
      </div>

     
<div className="card">
  <div className="section-header">
    <div>
      <h2>최근 DAG 실행 이력</h2>
      <p>DAG: weather_etl · 자동 갱신: 60초</p>
      <p>마지막 조회: {updatedAt || '-'}</p>
    </div>
  </div>


        {loading && runs.length === 0 ? (
          <p>실행 이력을 불러오는 중입니다.</p>
        ) : runs.length === 0 ? (
          <p>표시할 실행 이력이 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>실행 대상 시각</th>
                  <th>상태</th>
                  <th>실제 시작 시각</th>
                  <th>종료 시각</th>
                  <th>실행 ID</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.dag_run_id}>
                    <td>{formatDate(run.logical_date)}</td>
                    <td>{stateLabel(run.state)}</td>
                    <td>{formatDate(run.start_date)}</td>
                    <td>{formatDate(run.end_date)}</td>
                    <td>{run.dag_run_id ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
