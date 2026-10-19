export type WeatherObservation = {
  tm: string
  stn: string | number
  wd: string | number | null
  ws: string | number | null
  pa: string | number | null
  ps: string | number | null
  ta: string | number | null
  td: string | number | null
  hm: string | number | null
}

export type WeatherResponse = {
  query_date?: string
  count?: number
  data?: WeatherObservation[]
}

export const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const formatMetric = (value: string | number | null | undefined, unit = '') => {
  const number = toNumber(value)
  return number === null ? '—' : `${number.toFixed(1)}${unit}`
}

export const formatTime = (value: string) => {
  const match = value.match(/(\d{2}):(\d{2})(?::\d{2})?$/)
  return match ? `${match[1]}:${match[2]}` : value
}
