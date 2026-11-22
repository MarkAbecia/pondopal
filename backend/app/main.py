from fastapi import FastAPI

app = FastAPI(title="PondoPal API", version="0.1.0")


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
