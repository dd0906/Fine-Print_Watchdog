# Build the React/Vite frontend as a static bundle.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Serve the static frontend and FastAPI API from one Render web service.
FROM python:3.12-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

# Use the dependency versions exercised by the project's Python 3.12/Linux
# packaging setup, while keeping tests and development-only dependencies out
# of the runtime image.
COPY backend/requirements.txt /app/backend/requirements.txt
COPY backend/constraints-tested.txt /app/backend/constraints-tested.txt
RUN python -m pip install --upgrade pip \
    && python -m pip install --no-cache-dir \
       --constraint /app/backend/constraints-tested.txt \
       --requirement /app/backend/requirements.txt \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin watchdog

# Copy only runtime app modules, not backend tests, local backups or dev tools.
COPY backend/app/ /app/backend/app/
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist
RUN chown -R watchdog:watchdog /app
USER watchdog

# Render supplies PORT; its web services must bind on 0.0.0.0.
EXPOSE 10000
CMD ["sh", "-c", "exec uvicorn app.main:app --app-dir /app/backend --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
