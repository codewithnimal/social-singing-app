Set-Location backend
.\venv\Scripts\python.exe -m uvicorn src.main:app --reload

# In a separate terminal:
Set-Location vibelyfe
npm install
npx expo start