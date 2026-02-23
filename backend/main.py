from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import router
from model import model_instance
import threading
import os

app = FastAPI(title="Z-Image-INT8 API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("output_images", exist_ok=True)
app.mount("/images", StaticFiles(directory="output_images"), name="images")

app.include_router(router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    # Start loading the model in the background right away
    thread = threading.Thread(target=model_instance.load_model)
    thread.start()

@app.get("/")
def read_root():
    return {"message": "Z-Image-INT8 API is running"}
