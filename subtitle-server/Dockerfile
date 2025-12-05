FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Railway는 동적 포트를 사용하므로 ENV PORT 사용
ENV PORT=8000
EXPOSE $PORT

# shell form으로 변경하여 환경변수 확장 가능하게
CMD uvicorn main:app --host 0.0.0.0 --port $PORT

