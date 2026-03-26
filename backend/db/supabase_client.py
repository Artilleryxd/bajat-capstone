import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_ANON_KEY")

# Default client for anon / user operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# Service role client for admin operations (like server-side inserts bypassing RLS if needed, though usually standard client with JWT is better)
if SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    supabase_admin = supabase # Fallback if service role not provided
