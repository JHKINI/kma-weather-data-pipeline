import { formatMetric, formatTime, WeatherObservation } from '../lib/weather'

type Props = { data: WeatherObservation[]; loading: boolean; error: string | null }

export function WeatherTable({ data, loading, error }: Props) {
  if (loading) return <div className="state-panel"><span className="spinner" />관측 데이터를 불러오고 있습니다.</div>
  if (error) return <div className="state-panel error"><strong>조회에 실패했습니다</strong><span>{error}</span></div>
  if (!data.length) return <div className="state-panel"><strong>표시할 관측 데이터가 없습니다</strong><span>날짜를 선택한 뒤 조회해 주세요.</span></div>

  return <div className="table-wrap"><table>
    <thead><tr><th>관측 시각</th><th>지점</th><th>기온</th><th>습도</th><th>풍속</th><th>풍향</th><th>현지기압</th><th>해면기압</th><th>이슬점</th></tr></thead>
    <tbody>{data.map((item, index) => <tr key={`${item.tm}-${index}`}>
      <td className="tabular strong">{formatTime(item.tm)}</td><td>{item.stn || '—'}</td><td className="tabular">{formatMetric(item.ta, '°C')}</td><td className="tabular">{formatMetric(item.hm, '%')}</td><td className="tabular">{formatMetric(item.ws, ' m/s')}</td><td className="tabular">{formatMetric(item.wd, '°')}</td><td className="tabular">{formatMetric(item.pa, ' hPa')}</td><td className="tabular">{formatMetric(item.ps, ' hPa')}</td><td className="tabular">{formatMetric(item.td, '°C')}</td>
    </tr>)}</tbody>
  </table></div>
}
