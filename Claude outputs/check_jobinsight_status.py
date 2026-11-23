"""
JobInsight 상세 수집 결과 확인 스크립트

사용법 (결과 CSV가 있는 job_crawling 폴더에서):
    python check_jobinsight_status.py job_detail_retry40_improved_v7_results.csv

확인하는 것
1) 전체 건수 / 요청 성공 건수 (상태가 '요청/처리 실패'가 아닌 것)
2) 상태별 건수 (섹션 구조화 / 본문 텍스트 보존 / 이미지 중심 / 본문 텍스트 없음 / 요청 실패)
3) 구조화되지 않은 공고가 실제로 이미지 중심인지 (이미지수, 본문글자수 기준)
"""
import sys
import pandas as pd

path = sys.argv[1] if len(sys.argv) > 1 else "job_detail_retry40_improved_v7_results.csv"
df = pd.read_csv(path, encoding="utf-8-sig")

total = len(df)
failed = int((df["상태"] == "요청/처리 실패").sum())
print(f"파일: {path}")
print(f"전체: {total}건")
print(f"요청/처리 성공: {total - failed}건 / 실패: {failed}건")
print()

print("===== 상태별 건수 =====")
print(df["상태"].value_counts().to_string())
print()

not_structured = df[df["상태"] != "섹션 구조화"].copy()
print(f"===== 구조화 안 된 공고: {len(not_structured)}건 =====")

for col in ["이미지수", "본문글자수"]:
    if col in not_structured.columns:
        not_structured[col] = pd.to_numeric(not_structured[col], errors="coerce").fillna(0)

if len(not_structured):
    has_image = not_structured["이미지수"] > 0
    has_text = not_structured["본문글자수"] >= 200   # 200자는 임의 기준: 필요하면 바꾸세요
    print(f"- 이미지가 1장 이상 있음      : {int(has_image.sum())}건")
    print(f"- 본문 글자수 200자 이상       : {int(has_text.sum())}건 (표 등 텍스트는 있는데 제목 분류가 안 된 경우일 수 있음)")
    print(f"- 이미지 있고 본문 200자 미만  : {int((has_image & ~has_text).sum())}건 (이미지 중심 공고로 볼 수 있음)")
    print(f"- 이미지 없고 본문 200자 미만  : {int((~has_image & ~has_text).sum())}건 (실제 비어있는 공고인지 직접 확인 필요)")
    print()
    cols = [c for c in ["회사명", "공고명", "상태", "이미지수", "본문글자수", "URL"] if c in not_structured.columns]
    print("--- 구조화 안 된 공고 목록 (앞 15건) ---")
    print(not_structured[cols].head(15).to_string(index=False))
