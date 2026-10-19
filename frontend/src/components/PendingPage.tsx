import { Icon } from './Icon'

export function PendingPage({ type }: { type: 'quality' | 'pipeline' }) {
  const quality = type === 'quality'
  return <section className="page-content">
    <div className="page-heading"><div><p className="eyebrow">{quality ? 'DATA VALIDATION' : 'PIPELINE OPERATIONS'}</p><h1>{quality ? '데이터 품질 관리' : '파이프라인 모니터링'}</h1><p>{quality ? '결측값·중복·시간 간격·범위 검증 결과를 확인하는 공간입니다.' : '수집부터 적재까지의 ETL 실행 상태를 확인하는 공간입니다.'}</p></div></div>
    <section className="pending-card"><span className="pending-icon"><Icon name={quality ? 'shield' : 'flow'} size={28} /></span><p className="eyebrow">연동 준비 중</p><h2>{quality ? '품질 검증 결과 API가 아직 연결되지 않았습니다.' : 'Airflow 실행 이력 연동이 아직 확인되지 않았습니다.'}</h2><p>{quality ? '현재 API 응답에는 결측값, 중복, 시간 순서, 1시간 간격, 범위 검증 결과가 포함되어 있지 않습니다. 검증 결과를 저장·조회하는 API가 제공되면 실제 값만 표시합니다.' : 'Airflow 상태를 실제로 조회할 수 있는 연결이 제공되면 작업별 성공·실패 상태와 마지막 실행 시간을 표시합니다.'}</p></section>
  </section>
}
