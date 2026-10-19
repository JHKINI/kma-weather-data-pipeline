
import { useState } from 'react'
import { Icon } from './Icon'
import { WeatherObservation, WeatherResponse } from '../lib/weather'
import { ApiRequestError, weatherApi } from '../lib/weatherApi'
import { formatSourceLine } from '../lib/source'
import { WeatherTable } from './WeatherTable'

type Props = {
  data: WeatherObservation[]
  setData: (data: WeatherObservation[]) => void
  setQueryDate: (date: string) => void
  queryDate: string
  observedAt: string
  setObservedAt: (value: string) => void
}

const OFFICIAL_STATIONS = [
  { code: 90, name: '속초' },
  { code: 95, name: '철원' },
  { code: 100, name: '대관령' },
  { code: 101, name: '춘천' },
  { code: 105, name: '강릉' },
  { code: 108, name: '서울' },
  { code: 112, name: '인천' },
  { code: 114, name: '원주' },
  { code: 119, name: '수원' },
  { code: 127, name: '충주' },
  { code: 129, name: '서산' },
  { code: 130, name: '울진' },
  { code: 131, name: '청주' },
  { code: 133, name: '대전' },
  { code: 135, name: '추풍령' },
  { code: 136, name: '안동' },
  { code: 138, name: '포항' },
  { code: 140, name: '군산' },
  { code: 143, name: '대구' },
  { code: 146, name: '전주' },
  { code: 152, name: '울산' },
  { code: 155, name: '창원' },
  { code: 156, name: '광주' },
  { code: 159, name: '부산' },
  { code: 162, name: '통영' },
  { code: 165, name: '목포' },
  { code: 168, name: '여수' },
  { code: 170, name: '완도' },
  { code: 192, name: '진주' },
  { code: 201, name: '강화' },
  { code: 202, name: '양평' },
  { code: 203, name: '이천' },
  { code: 211, name: '인제' },
  { code: 212, name: '홍천' },
  { code: 216, name: '태백' },
  { code: 221, name: '제천' },
  { code: 226, name: '보은' },
  { code: 232, name: '천안' },
  { code: 235, name: '보령' },
  { code: 236, name: '부여' },
  { code: 238, name: '금산' },
  { code: 243, name: '부안' },
  { code: 244, name: '임실' },
  { code: 245, name: '정읍' },
  { code: 247, name: '남원' },
  { code: 248, name: '장수' },
  { code: 260, name: '장흥' },
  { code: 261, name: '해남' },
  { code: 262, name: '고창' },
  { code: 271, name: '봉화' },
  { code: 272, name: '영주' },
  { code: 273, name: '문경' },
  { code: 277, name: '영덕' },
  { code: 278, name: '의성' },
  { code: 279, name: '구미' },
  { code: 281, name: '영천' },
  { code: 284, name: '거창' },
  { code: 285, name: '합천' },
  { code: 288, name: '밀양' },
  { code: 289, name: '산청' },
  { code: 294, name: '거제' },
  { code: 295, name: '남해' },
]

const HOURS = Array.from({ length: 24 }, (_, hour) => {
  const value = String(hour).padStart(2, '0')
  return { value, label: `${value}:00` }
})

function getLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function WeatherPage({
  data,
  setData,
  setQueryDate,
  queryDate,
  observedAt,
  setObservedAt,
}: Props) {
  const initialDate = queryDate || getLocalDate()

  const [station, setStation] = useState('108')
  const [startDate, setStartDate] = useState(initialDate)
  const [startHour, setStartHour] = useState('00')
  const [endDate, setEndDate] = useState(initialDate)
  const [endHour, setEndHour] = useState('23')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(Boolean(data.length))

  const selectedStation = OFFICIAL_STATIONS.find(
    (item) => String(item.code) === station,
  )

  const handleSearch = async () => {
    if (!station || !startDate || !endDate) {
      setError('관측 지점과 시작·종료 날짜를 선택해 주세요.')
      return
    }

    const start = `${startDate}T${startHour}:00:00`
    const end = `${endDate}T${endHour}:00:00`

    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()

    if (startTime > endTime) {
      setError('종료 일시는 시작 일시보다 빠를 수 없습니다.')
      return
    }

    if (endTime - startTime > 31 * 24 * 60 * 60 * 1000) {
      setError('한 번에 최대 31일까지 조회할 수 있습니다.')
      return
    }

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const params = new URLSearchParams({
        stn: station,
        start: start.replace('T', ' '),
        end: end.replace('T', ' '),
      })

      const result = await weatherApi<WeatherResponse>(
        `/api/weather?${params.toString()}`,
      )

      const items = Array.isArray(result.data) ? result.data : []

      setData(items)
      setQueryDate(startDate)
      setObservedAt(
        new Date().toLocaleString('sv-SE', {
          timeZone: 'Asia/Seoul',
        }) + ' KST',
      )
    } catch (err) {
      setData([])
      setError(
        err instanceof ApiRequestError
          ? err.message
          : '알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OBSERVATION EXPLORER</p>
          <h1>기상 데이터 조회</h1>
          <p>관측 지점과 조회 기간을 선택해 ASOS 시간별 관측 데이터를 확인합니다.</p>
        </div>
      </div>

      <section className="card query-card" aria-label="관측 데이터 조회 조건">
        <div className="query-controls">
          <label>
            관측 지점
            <select
              value={station}
              onChange={(event) => setStation(event.target.value)}
            >
              {OFFICIAL_STATIONS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </label>

          <label>
            시작 날짜
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            시작 시간
            <select
              value={startHour}
              onChange={(event) => setStartHour(event.target.value)}
            >
              {HOURS.map((hour) => (
                <option key={hour.value} value={hour.value}>
                  {hour.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            종료 날짜
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <label>
            종료 시간
            <select
              value={endHour}
              onChange={(event) => setEndHour(event.target.value)}
            >
              {HOURS.map((hour) => (
                <option key={hour.value} value={hour.value}>
                  {hour.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="primary-button press"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner small" />
            ) : (
              <Icon name="refresh" />
            )}
            {loading ? '조회 중' : '데이터 조회'}
          </button>
        </div>

        <p className="query-help">
          {formatSourceLine(observedAt)} · 선택 지점:{' '}
          {selectedStation
            ? `${selectedStation.name} (${selectedStation.code})`
            : station}
          {' · '}
          API: <code>/api/weather?stn=&amp;start=&amp;end=</code>
        </p>
      </section>

      <section className="card table-card">
        <div className="section-header">
          <div>
            <h2>시간별 관측 데이터</h2>
            <p>
              {searched
                ? `${selectedStation?.name ?? station} · ${startDate} ${startHour}:00 ~ ${endDate} ${endHour}:00 · ${data.length}건`
                : '관측 지점과 조회 기간을 선택해 주세요.'}
            </p>
          </div>

          {data.length > 0 && (
            <span className="count-badge tabular">
              {data.length} RECORDS
            </span>
          )}
        </div>

        <WeatherTable data={data} loading={loading} error={error} />
      </section>
    </section>
  )
}
