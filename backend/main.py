from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, profile
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FinSight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)

@app.get("/")
async def root():
    return {"status": "healthy", "service": "FinSight API Backend"}
