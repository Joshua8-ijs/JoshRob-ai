from app import create_app

app = create_app()

if __name__ == "__main__":
    import os

    from app.config import HOST, PORT

    port = int(os.environ.get("JOSHROB_PYTHON_PORT", PORT))
    app.run(host=HOST, port=port, debug=True)
