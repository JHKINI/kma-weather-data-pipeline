import sourceInfo from '../data.json'

export type SourceInfo = {
  asOf?: string
  source?: { name?: string; url?: string }
  status?: string
}

export const dataSource = sourceInfo as SourceInfo

export const formatSourceLine = (observedAt?: string) => {
  const basis = observedAt ? `${observedAt.replace('T', ' ')} 관측 기준` : dataSource.asOf ? `${dataSource.asOf} 기준` : '기준 시각 확인 중'
  const name = dataSource.source?.name || '출처 확인 중'
  return `${basis} · 출처 ${name}`
}
