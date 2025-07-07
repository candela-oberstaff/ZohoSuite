FROM python:3.9-slim

WORKDIR /app

# Copiar solo requirements primero para aprovechar el caché
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

# Asegurar que los archivos tienen los permisos correctos
RUN chmod -R 755 /app

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]