from __future__ import annotations

import io
from typing import List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from openpyxl import load_workbook

app = FastAPI(title="Wavelength Range Analyzer", version="0.1.0")
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse("static/index.html")


def _parse_csv_bytes(raw: bytes) -> tuple[List[float], List[float], List[List[float]]]:
    text = raw.decode("utf-8", errors="ignore").strip()
    lines = [line for line in text.splitlines() if line.strip()]
    if len(lines) < 2:
        raise ValueError("CSV must have at least header and one data row")

    header_cells = [c.strip() for c in lines[0].split(",")]
    if len(header_cells) < 3:
        raise ValueError("CSV header is too short")

    try:
        wavelengths = [float(v) for v in header_cells[:-1]]
    except ValueError as exc:
        raise ValueError("Header wavelengths must be numeric") from exc

    times: List[float] = []
    matrix: List[List[float]] = []
    for line in lines[1:]:
        cells = [c.strip() for c in line.split(",")]
        if len(cells) < len(wavelengths) + 1:
            continue
        try:
            intensities = [float(v) for v in cells[: len(wavelengths)]]
            t = float(cells[len(wavelengths)])
        except ValueError:
            continue

        matrix.append(intensities)
        times.append(t)

    if not times:
        raise ValueError("No valid numeric rows found in CSV")
    return wavelengths, times, matrix


def _parse_xlsx_bytes(raw: bytes) -> tuple[List[float], List[float], List[List[float]]]:
    wb = load_workbook(io.BytesIO(raw), data_only=True)
    ws = wb.active

    max_col = ws.max_column
    max_row = ws.max_row
    if max_row < 2 or max_col < 3:
        raise ValueError("Excel sheet is too small")

    wavelengths: List[float] = []
    for col in range(1, max_col):
        value = ws.cell(row=1, column=col).value
        if value is None or str(value).strip() == "":
            break
        try:
            wavelengths.append(float(value))
        except (TypeError, ValueError):
            raise ValueError("First row must be numeric wavelengths")

    if len(wavelengths) < 2:
        raise ValueError("Could not parse wavelengths from first row")

    time_col = len(wavelengths) + 1
    times: List[float] = []
    matrix: List[List[float]] = []

    for row in range(2, max_row + 1):
        row_values: List[float] = []
        valid_row = True
        for col in range(1, len(wavelengths) + 1):
            value = ws.cell(row=row, column=col).value
            if value is None:
                valid_row = False
                break
            try:
                row_values.append(float(value))
            except (TypeError, ValueError):
                valid_row = False
                break

        if not valid_row:
            continue

        time_value = ws.cell(row=row, column=time_col).value
        try:
            t = float(time_value)
        except (TypeError, ValueError):
            continue

        matrix.append(row_values)
        times.append(t)

    if not times:
        raise ValueError("No valid data rows found")
    return wavelengths, times, matrix


def _parse_uploaded_matrix(upload: UploadFile, raw: bytes) -> tuple[List[float], List[float], List[List[float]]]:
    name = (upload.filename or "").lower()
    if name.endswith(".xlsx"):
        return _parse_xlsx_bytes(raw)
    if name.endswith(".csv"):
        return _parse_csv_bytes(raw)
    raise ValueError("Only .xlsx and .csv are supported")


@app.post("/api/analyze-range")
async def analyze_range(
    file: UploadFile = File(...),
    min_wavelength_nm: float = Form(...),
    max_wavelength_nm: float = Form(...),
):
    if min_wavelength_nm > max_wavelength_nm:
        raise HTTPException(status_code=400, detail="min_wavelength_nm must be <= max_wavelength_nm")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        wavelengths, times, matrix = _parse_uploaded_matrix(file, raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    selected_indices = [
        i for i, wl in enumerate(wavelengths) if min_wavelength_nm <= wl <= max_wavelength_nm
    ]
    if not selected_indices:
        raise HTTPException(
            status_code=400,
            detail="No wavelength columns in requested range",
        )

    avg_intensity = []
    for row in matrix:
        values = [row[i] for i in selected_indices]
        avg_intensity.append(sum(values) / len(values))

    return {
        "range_nm": [min_wavelength_nm, max_wavelength_nm],
        "selected_wavelength_count": len(selected_indices),
        "time_ns": times,
        "avg_intensity": avg_intensity,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
