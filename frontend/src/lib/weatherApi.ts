const configuredBase = import.meta.env.VITE_KMA_API_BASE_URL || 'http://127.0.0.1:8002'

export const weatherApiBaseUrl = configuredBase.replace(/\/$/, '')

export class ApiRequestError extends Error {
  kind: 'network' | 'http'
  status?: number

  constructor(message: string, kind: 'network' | 'http', status?: number) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

export async function weatherApi<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${weatherApiBaseUrl}${path}`)
  } catch {
    throw new ApiRequestError('기상 데이터 서버에 연결할 수 없습니다. 서버 실행 상태와 연결 주소를 확인해 주세요.', 'network')
  }

  if (!response.ok) {
    throw new ApiRequestError(`요청을 처리하지 못했습니다. (HTTP ${response.status})`, 'http', response.status)
  }

  try {
    return await response.json() as T
  } catch {
    throw new ApiRequestError('서버 응답 형식을 읽을 수 없습니다.', 'http', response.status)
  }
}
