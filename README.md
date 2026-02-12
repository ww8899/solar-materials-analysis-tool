# Solar Materials Analysis Tool

This project provides two browser tools:

1. `Wavelength Rage Analyzer`
2. `Curve Fitting`

## Tools

### 1. Wavelength Rage Analyzer

Input file format (`.xlsx` or `.csv`):
- Row 1: wavelength columns (for example `900 ... 300`)
- Rightmost column: time (`ns`)
- Middle cells: intensity

What it does:
- User selects wavelength range
- Computes average intensity vs time
- Plots:
  - x-axis: time (`ns`)
  - y-axis: average intensity
- Supports exporting plotted data to Excel

### 2. Curve Fitting

Input file format (`.xlsx` or `.csv`):
- Two numeric columns
- Column 1: `x`
- Column 2: `y`

Workflow:
- On file upload, raw data is plotted immediately (black)
- User selects function and clicks `Fit`
- Fitted curve is added (dotted red)
- Fitted parameters are shown (only relevant parameters)

Supported fit functions:
- `y = a x`
- `y = a x + b`
- `y = a x^2 + b x + c`
- `y = a x^3 + b x^2 + c x + d`
- `y = log_n(x)`
- `y = a ln(x) + b`
- `y = a exp(bx)`
- `y = a x^b`
- `y = a/x + b`

## Sample Data

Sample files are in `sample_data/`:
- `sample_data/synthetic_trpl_2d.xlsx` (for Wavelength Rage Analyzer)
- `sample_data/linear_data_example.xlsx` (for Curve Fitting)

## Quick Start (Docker, Recommended)

From repo root:

```bash
docker rm -f wavelength-ui 2>/dev/null || true
docker build -f Dockerfile.ui -t wavelength-ui:latest .
docker run -d --name wavelength-ui -p 8010:8010 wavelength-ui:latest
```

Health check:

```bash
curl http://127.0.0.1:8010/health
```

Open UI:

- `http://127.0.0.1:8010/`

## API Quick Checks

Wavelength analyzer:

```bash
curl -X POST "http://127.0.0.1:8010/api/analyze-range" \
  -F "file=@sample_data/synthetic_trpl_2d.xlsx" \
  -F "min_wavelength_nm=680" \
  -F "max_wavelength_nm=720"
```

Curve fitting (`y = a x` example):

```bash
curl -X POST "http://127.0.0.1:8010/api/curve-fit" \
  -F "file=@sample_data/linear_data_example.xlsx" \
  -F "function_type=linear_ax"
```

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
