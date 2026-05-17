import pandas as pd
from supabase import create_client, ClientOptions
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

# Tell the client to look in the 'silver' room
options = ClientOptions(schema="silver")
supabase = create_client(url, key, options=options)

try:
    print("Connecting to silver schema to pull all 7000+ rows...")
    
    all_data = []  # We will store all chunks of data here
    limit = 1000   # Max rows per request
    offset = 0     # Starting point

    while True:
        # Pull data in chunks using .range()
        response = supabase.table("courses").select("*").range(offset, offset + limit - 1).execute()
        
        data_chunk = response.data
        
        # If the chunk is empty, it means we've reached the end of the table
        if not data_chunk:
            break
            
        # Add the chunk to our main list
        all_data.extend(data_chunk)
        print(f"Fetched {len(all_data)} rows so far...")
        
        # Move the offset forward for the next loop (e.g., from 0 to 1000, then 2000)
        offset += limit

    # Check if we got data overall
    if all_data:
        df = pd.DataFrame(all_data)
        # Save it to your device
        df.to_csv("graduation_data_raw.csv", index=False)
        print(f"\nSuccess! All {len(df)} rows saved to graduation_data_raw.csv")
    else:
        print("Connected, but the table seems empty or RLS is blocking access.")

except Exception as e:
    print(f"Failed to pull data: {e}")