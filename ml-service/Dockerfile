FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Train model on first startup if not present, then start server
CMD ["sh", "-c", "python -c \"from model.train import load_model; load_model()\" && uvicorn main:app --host 0.0.0.0 --port 8000"]
