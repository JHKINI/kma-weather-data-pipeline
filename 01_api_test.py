import requests
import os
from dotenv import load_dotenv

load_dotenv()

auth_key = os.getenv("KMA_AUTH_KEY")

url = "https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php"

params = {
    "tm": "202211300900",
    "stn": "108",
    "authKey": auth_key
}

response = requests.get(url, params=params)

print("상태 코드:", response.status_code)
print(response.text[:3000])