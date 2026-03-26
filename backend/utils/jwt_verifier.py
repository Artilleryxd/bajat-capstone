from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase.client import Client
from db.supabase_client import supabase

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        # Use Supabase client to get the user from the JWT token
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(
                status_code=401,
                detail={"code": "UNAUTHORIZED", "message": "Invalid authentication credentials"}
            )
        return {"id": res.user.id, "email": res.user.email}
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Could not validate credentials", "detail": str(e)}
        )
