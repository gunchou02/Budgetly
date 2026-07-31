FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /code

ARG INSTALL_DEV=false

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_DEV" = "true" ]; then pip install --no-cache-dir -r requirements-dev.txt; fi

RUN addgroup --system app && adduser --system --ingroup app app

COPY --chown=app:app app ./app

USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
