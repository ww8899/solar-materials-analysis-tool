# Wavelength Range Analyzer

Upload a 2D matrix file (`.xlsx` or `.csv`) where:
- Row 1 = wavelength columns (for example `900 ... 300`)
- Rightmost column = time (`ns`)
- Interior cells = intensity

The app computes average intensity in a wavelength range and plots:
- x-axis: time (ns)
- y-axis: average intensity

## Project Files

- Backend/API: `app/main.py`
- UI: `static/index.html`, `static/app.js`, `static/styles.css`
- Docker runtime: `Dockerfile.ui`
- Example input file: `synthetic_trpl_2d.xlsx`

## Quick Start (Recommended: Docker)

Run from repo root:

```bash
docker rm -f wavelength-ui 2>/dev/null || true
docker build -f Dockerfile.ui -t wavelength-ui:latest .
docker run -d --name wavelength-ui -p 8010:8010 wavelength-ui:latest
```

Verify the service is up:

```bash
curl http://127.0.0.1:8010/health
```

Expected response:

```json
{"status":"ok"}
```

Open UI:

- `http://127.0.0.1:8010/`

## Plot Validation (CLI)

Use the included sample file to verify analysis end-to-end:

```bash
curl -X POST "http://127.0.0.1:8010/api/analyze-range" \
  -F "file=@synthetic_trpl_2d.xlsx" \
  -F "min_wavelength_nm=680" \
  -F "max_wavelength_nm=720"
```

If this returns JSON with `time_ns` and `avg_intensity`, plotting in the UI will work.

## UI Steps

1. Open `http://127.0.0.1:8010/`
2. Select `synthetic_trpl_2d.xlsx`
3. Enter wavelength range, for example:
   - Min: `680`
   - Max: `720`
4. Click `Analyze and Plot`

## Local Run (Without Docker)

Requirements:
- Python 3.10+

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Then open:
- `http://127.0.0.1:8010/`

## Troubleshooting

- `TypeError: Failed to fetch` in browser:
  - Usually means backend is not running or wrong URL/port.
  - Check `http://127.0.0.1:8010/health`.
- `This site can’t be reached`:
  - Start/restart container:
    - `docker restart wavelength-ui`
- Port already in use:
  - Run on another host port:
    - `docker run -d --name wavelength-ui -p 8011:8010 wavelength-ui:latest`
  - Then open `http://127.0.0.1:8011/`.
