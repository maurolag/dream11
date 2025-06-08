# Dream11 Football Builder

Este repositorio contiene una aplicación de ejemplo construida con **FastAPI** en el backend y **React** en el frontend. La idea es que puedas generar y compartir formaciones de fútbol de manera sencilla.

## Requisitos

- Python 3.11
- Node.js 20 con Yarn
- Una instancia de MongoDB accesible en `mongodb://localhost:27017`

## Ejecución local

1. Clona el repositorio y sitúate en la carpeta principal.
2. Instala las dependencias del backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Asegúrate de tener un archivo `.env` con la URL de tu base de datos MongoDB. Por defecto se usa:
   ```ini
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="test_database"
   ```
4. Inicia el servidor FastAPI:
   ```bash
   uvicorn server:app --reload --port 8001
   ```
5. En otra terminal instala las dependencias del frontend y configura la URL del backend:
   ```bash
   cd frontend
   yarn install
   echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
   yarn start
   ```
   La aplicación se abrirá en `http://localhost:3000`.

## Uso de Docker

También puedes construir una imagen que incluya el frontend compilado y el backend servido con Nginx:

```bash
docker build -t dream11-app .
docker run -p 80:80 \
    -e MONGO_URL=mongodb://host.docker.internal:27017 \
    dream11-app
```

Recuerda tener MongoDB ejecutándose (por ejemplo con `docker run -d -p 27017:27017 mongo`). Tras levantar el contenedor podrás acceder a `http://localhost`.

## Poblar datos de ejemplo

Con el backend en marcha, puedes cargar jugadores y temas de prueba ejecutando:

```bash
curl -X POST http://localhost:8001/api/init-data
```

Esto creará varios jugadores famosos y temas para probar la aplicación.

