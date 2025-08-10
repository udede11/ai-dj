#!/bin/bash

# Set SUNO_API_URL environment variable in Supabase
echo "Setting SUNO_API_URL environment variable in Supabase..."

npx supabase secrets set SUNO_API_URL=https://suno-api-2.onrender.com

echo "Environment variable set! Now all functions will use this URL."
echo "To update the URL in the future, just run:"
echo "npx supabase secrets set SUNO_API_URL=<new-url>"