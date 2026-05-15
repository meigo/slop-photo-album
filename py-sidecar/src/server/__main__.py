"""Entry point. Run as `python -m server` from py-sidecar/ with venv active."""
import socket
import sys

import uvicorn

from server.app import build_app


def _free_port() -> int:
    """Bind to port 0 to let the OS pick, then close and re-use that port.

    There's a TOCTOU race here (something else could grab the port between
    our close and uvicorn's bind), but the renderer reaches us via this
    process's stdout-announced port, not by guessing, so a re-rolled port
    on the rare race only delays our first announcement.
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> None:
    app = build_app()
    port = _free_port()
    # Print SIDECAR_READY *before* uvicorn.run blocks. Tauri parses this
    # line from our stdout to discover the port. Newline-flushed so the
    # async readline in Rust sees it immediately.
    print(f"SIDECAR_READY {port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
