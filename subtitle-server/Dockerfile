FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Railway는 동적 포트를 $PORT 환경변수로 제공
# 기본값을 설정하지 않아 Railway가 제공하는 포트 사용
EXPOSE 8000

# exec form 사용 + sh -c로 환경변수 확장
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

