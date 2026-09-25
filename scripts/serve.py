"""Same-origin static server with HTTP Range (what PMTiles needs).

Some Python 3.12 http.server builds ignore Range and send the whole
archive. This handler always answers 206 for `Range: bytes=`.
"""

from __future__ import annotations

import argparse
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RangeRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        # Remotion Studio (:3000) Range-GETs the archive from this origin.
        # Same-origin map page ignores these headers.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range")
        self.send_header(
            "Access-Control-Expose-Headers",
            "Accept-Ranges, Content-Range, Content-Length, ETag",
        )
        if self.path.split("?", 1)[0].endswith(".pmtiles"):
            self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_OPTIONS(self):
        # Range is not a CORS-safelisted request header, so the Studio
        # preview sends a preflight before the first tile fetch.
        self.send_response(204)
        self.end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()
        file_size = os.path.getsize(path)
        range_header = self.headers.get("Range")
        if not range_header or not range_header.startswith("bytes="):
            return super().send_head()
        spec = range_header.split("=", 1)[1].split(",")[0].strip()
        if "-" not in spec:
            self.send_error(400, "Bad Range")
            return None
        start_s, end_s = spec.split("-", 1)
        try:
            if start_s == "" and end_s:
                start = max(file_size - int(end_s), 0)
                end = file_size - 1
            else:
                start = int(start_s) if start_s else 0
                end = int(end_s) if end_s else file_size - 1
        except ValueError:
            self.send_error(400, "Bad Range")
            return None
        if start < 0 or end >= file_size or start > end:
            self.send_error(416, "Range Not Satisfiable")
            return None
        length = end - start + 1
        raw = open(path, "rb")
        raw.seek(start)
        self.send_response(206)
        ctype = (
            "application/vnd.pmtiles"
            if path.endswith(".pmtiles")
            else self.guess_type(path)
        )
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        return _LimitedFile(raw, length)


class _LimitedFile:
    """copyfileobj stops at EOF; cap the body to the Range length."""

    def __init__(self, fh, remaining: int):
        self._fh = fh
        self._remaining = remaining

    def read(self, size=-1):
        if self._remaining <= 0:
            return b""
        n = self._remaining if size < 0 else min(size, self._remaining)
        chunk = self._fh.read(n)
        self._remaining -= len(chunk)
        return chunk

    def close(self):
        self._fh.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the map with Range for PMTiles.")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    args = parser.parse_args()
    httpd = ThreadingHTTPServer(("127.0.0.1", args.port), RangeRequestHandler)
    print(f"serving {ROOT} on http://127.0.0.1:{args.port}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
