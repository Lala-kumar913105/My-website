# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# Make port 8000 available to the world outside this container
EXPOSE 8000

CMD ["gunicorn", "-c", "gunicorn_config.py", "app.main:app"]