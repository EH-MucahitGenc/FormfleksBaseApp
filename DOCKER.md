# Docker Run

1. Ensure connection and auth values are set in `FormfleksBaseApp.Api/appsettings.json`.

2. Build and run:

```powershell
docker compose up --build -d
```

3. API:

- `http://localhost:8080/swagger`
- `http://localhost:8080/health/live`
- `http://localhost:8080/health/ready`

4. Stop:

```powershell
docker compose down
```
