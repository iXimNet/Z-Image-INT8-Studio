from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import uuid
import os
from database import get_db, GenerationTask
from model import model_instance
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = "模糊，低质量，变形，伪影，多余肢体"
    seed: int = 42
    steps: int = 30
    guidance: float = 4.0
    width: int = 1024
    height: int = 1024

class TaskResponse(BaseModel):
    id: str
    status: str
    prompt: str | None = None
    negative_prompt: str | None = None
    image_url: str | None = None
    error_message: str | None = None
    seed: int | None = None
    steps: int | None = None
    guidance: float | None = None
    width: int | None = None
    height: int | None = None
    file_size: int | None = None
    created_at: datetime | None = None

def run_generation_task(task_id: str, request: GenerateRequest, db: Session):
    try:
        # Load model if not already loaded
        if not model_instance.pipe:
            model_instance.load_model()

        if model_instance.load_error:
            raise Exception("Model Failed to load: " + model_instance.load_error)

        db_task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
        if not db_task:
            return

        db_task.status = "processing"
        db.commit()

        # Generate image
        image = model_instance.generate(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=request.seed,
            steps=request.steps,
            guidance=request.guidance,
            width=request.width,
            height=request.height,
        )

        # Save image
        os.makedirs("output_images", exist_ok=True)
        filename = f"{task_id}.png"
        filepath = os.path.join("output_images", filename)
        image.save(filepath)

        # Get file size
        file_size = os.path.getsize(filepath)

        db_task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
        db_task.status = "completed"
        db_task.image_url = f"/images/{filename}"
        db_task.file_size = file_size
        db.commit()
    except Exception as e:
        db_task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
        if db_task:
            db_task.status = "failed"
            db_task.error_message = str(e)
            db.commit()

@router.post("/generate", response_model=TaskResponse)
async def generate_image(request: GenerateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    task_id = str(uuid.uuid4())

    new_task = GenerationTask(
        id=task_id,
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        status="pending",
        seed=request.seed,
        steps=request.steps,
        guidance=request.guidance,
        width=request.width,
        height=request.height,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    background_tasks.add_task(run_generation_task, task_id, request, db)

    return TaskResponse(id=task_id, status="pending")

@router.get("/status/{task_id}", response_model=TaskResponse)
async def get_task_status(task_id: str, db: Session = Depends(get_db)):
    task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskResponse(
        id=task.id,
        status=task.status,
        prompt=task.prompt,
        negative_prompt=task.negative_prompt,
        image_url=task.image_url,
        error_message=task.error_message,
        seed=task.seed,
        steps=task.steps,
        guidance=task.guidance,
        width=task.width,
        height=task.height,
        file_size=task.file_size,
        created_at=task.created_at,
    )

@router.get("/history")
async def get_history(limit: int = 50, db: Session = Depends(get_db)):
    tasks = db.query(GenerationTask).order_by(GenerationTask.created_at.desc()).limit(limit).all()
    return tasks

@router.delete("/history/{task_id}")
async def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Delete file if exists
    if task.image_url:
        filename = task.image_url.split("/")[-1]
        filepath = os.path.join("output_images", filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    db.delete(task)
    db.commit()
    return JSONResponse(content={"detail": "deleted"}, status_code=200)
