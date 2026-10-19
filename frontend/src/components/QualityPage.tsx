
import { useState } from 'react'
import { weatherApi } from '../lib/weatherApi'

type QualityReport = {
  total_count: number
  missing_count: number
  duplicate_count: number
  time_order_error: boolean
  time_interval_error: boolean
  range_errors: Record<string, string>
  status: 'PASS' | 'FAIL'
}

type QualityResponse = {
  query_date: string
  count: number
  status: 'PASS' | 'FAIL' | 'NO_DATA'
  message?: string
  report: QualityReport | null
}

export function QualityPage() {
  const [date, setDate] = useState('2026-09-15')
  const [result, setResult] = useState<QualityResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!date) {
      setError('검증할 날짜를 선택해 주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await weatherApi<QualityResponse>(
        `/api/quality?date=${encodeURIComponent(date)}`
      )
      setResult(response)
    } catch {
      setError(
        '품질 검증 결과를 불러오지 못했습니다. FastAPI 서버와 날짜를 확인해 주세요.'
      )
    } finally {
      setLoading(false)
    }
  }

  const report = result?.report

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DATA VALIDATION</p>
          <h1>데이터 품질 관리</h1>
          <p>
            날짜별 관측 데이터의 결측값, 중복, 시간 간격 및 측정 범위를
            검증합니다.
          </p>
        </div>
      </div>

      <section className="card query-card">
        <div className="query-controls">
          <label>
            검증 날짜
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <button
            className="primary-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? '검증 결과 조회 중...' : '검증 결과 조회'}
          </button>
        </div>

        <p className="query-help">
          FastAPI <code>/api/quality?date=YYYY-MM-DD</code> 응답 기준
        </p>
      </section>

      {loading && (
        <div className="state-panel">
          검증 결과를 불러오고 있습니다.
        </div>
      )}

      {error && (
        <div className="state-panel error">
          <strong>조회 실패</strong>
          <span>{error}</span>
        </div>
      )}

      {result && !loading && (
        <>
          <section className="card query-card">
            <p className="eyebrow">VALIDATION RESULT</p>
            <h2>
              {result.status === 'PASS'
                ? '데이터 품질 검증 통과'
                : result.status === 'FAIL'
                  ? '데이터 품질 검증 실패'
                  : '검증할 데이터 없음'}
            </h2>

            <p>
              조회 날짜: {result.query_date} · 데이터 {result.count}건
            </p>

            {result.message && <p>{result.message}</p>}
          </section>

          {report && (
            <>
              <div className="metric-grid">
                <Metric
                  label="전체 데이터"
                  value={`${report.total_count}건`}
                />
                <Metric
                  label="결측값"
                  value={`${report.missing_count}건`}
                />
                <Metric
                  label="중복 데이터"
                  value={`${report.duplicate_count}건`}
                />
                <Metric
                  label="시간 순서 오류"
                  value={report.time_order_error ? '있음' : '없음'}
                />
                <Metric
                  label="시간 간격 오류"
                  value={report.time_interval_error ? '있음' : '없음'}
                />
              </div>

              <section className="card query-card">
                <div className="section-header">
                  <div>
                    <h2>검증 항목별 결과</h2>
                    <p>API에서 반환한 실제 검증 결과</p>
                  </div>
                  <span className="count-badge">
                    {report.status}
                  </span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>검증 항목</th>
                        <th>결과</th>
                        <th>상세</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>결측값</td>
                        <td>{report.missing_count === 0 ? 'PASS' : 'FAIL'}</td>
                        <td>{report.missing_count}건</td>
                      </tr>
                      <tr>
                        <td>중복 데이터</td>
                        <td>{report.duplicate_count === 0 ? 'PASS' : 'FAIL'}</td>
                        <td>{report.duplicate_count}건</td>
                      </tr>
                      <tr>
                        <td>시간 순서</td>
                        <td>{report.time_order_error ? 'FAIL' : 'PASS'}</td>
                        <td>{report.time_order_error ? '순서 오류 있음' : '오류 없음'}</td>
                      </tr>
                      <tr>
                        <td>1시간 간격</td>
                        <td>{report.time_interval_error ? 'FAIL' : 'PASS'}</td>
                        <td>{report.time_interval_error ? '간격 오류 있음' : '오류 없음'}</td>
                      </tr>
                      <tr>
                        <td>측정값 범위</td>
                        <td>{Object.keys(report.range_errors).length === 0 ? 'PASS' : 'FAIL'}</td>
                        <td>
                          {Object.keys(report.range_errors).length === 0
                            ? '범위 오류 없음'
                            : Object.entries(report.range_errors)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong className="tabular">{value}</strong>
      <span>API 응답 기준</span>
    </article>
  )
}
