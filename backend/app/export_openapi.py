"""Write the OpenAPI spec to misc/api/openapi.json. Run: uv run python -m app.export_openapi"""

import json
from pathlib import Path

from app.main import app

OUT = Path(__file__).resolve().parents[2] / "misc" / "api" / "openapi.json"

if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")
