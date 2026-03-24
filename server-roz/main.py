import os
import json
import traceback
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from contextlib import asynccontextmanager
from typing import Dict, List, Optional
import joblib
import pandas as pd
import numpy as np
from dotenv import load_dotenv

load_dotenv() 

GENAI_API_KEY = os.getenv("GEMINI_API_KEY")
ACTIVE_MODEL_NAME = "models/gemini-2.5-flash" 

if not GENAI_API_KEY:
    print("⚠️ WARNING: GEMINI_API_KEY not found in .env file.")
else:
    try:
        genai.configure(api_key=GENAI_API_KEY)
        print("✅ Gemini API Key Loaded.")
    except Exception as e:
        print(f"❌ Error configuring Gemini: {e}")

# --- DYNAMIC MODEL SELECTOR ---
def configure_best_model():
    """Dynamically sets ACTIVE_MODEL_NAME based on availability and preference."""
    global ACTIVE_MODEL_NAME
    print("🔍 Searching for available Gemini models...")
    try:
        preferred_order = ["models/gemini-2.5-flash", "models/gemini-2.5-pro", "models/gemini-1.5-flash", "models/gemini-1.0-pro"]
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        for model in preferred_order:
            if model in available_models:
                ACTIVE_MODEL_NAME = model
                short_name = ACTIVE_MODEL_NAME.split('/')[-1]
                print(f"✅ SUCCESS: Using model '{short_name}'")
                return

        if available_models:
            ACTIVE_MODEL_NAME = available_models[0]
            short_name = ACTIVE_MODEL_NAME.split('/')[-1]
            print(f"⚠️ Using fallback model: '{short_name}'")
        else:
            print("❌ CRITICAL: No generative models found. AI endpoints will fail.")
            ACTIVE_MODEL_NAME = "models/gemini-2.5-flash" 
            
    except Exception as e:
        print(f"❌ Error listing models: {e}")

ml_artifacts = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    if GENAI_API_KEY:
        configure_best_model() 
    
    try:
        # Change from pickle.load to joblib.load
        model = joblib.load('finance_income_growth_model.pkl')
            
        ml_artifacts['classification_model'] = model
        print("✅ Finance ML Artifacts loaded successfully.")
        
    except FileNotFoundError:
        print("❌ Error: 'finance_income_growth_model.pkl' not found.")
        ml_artifacts['error'] = True
    
    yield
    ml_artifacts.clear()
app = FastAPI(lifespan=lifespan)

# --- CORS MIDDLEWARE ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models (Updated for Finance) ---
class FinanceInput(BaseModel):
    income: float = Field(..., alias="Income")
    age: float = Field(..., alias="Age")
    dependents: float = Field(..., alias="Dependents")
    occupation: int = Field(..., alias="Occupation") 
    city_tier: int = Field(..., alias="City_Tier")   
    total_expense: float = Field(..., alias="Total_Expense")
    desired_savings: float = Field(..., alias="Desired_Savings")

    model_config = ConfigDict(populate_by_name=True, extra="allow")

class ChatRequest(BaseModel):
    message: str
    user_context: Optional[str] = "General User"

class TestRequest(BaseModel):
    difficulty: str
    test_type: str
    learning_context: str

class TestResult(BaseModel):
    score: int
    total_marks: int
    wrong_answers: List[str]

# --- Helper Logic ---
def get_financial_recommendations(risk_level: str, savings_potential: float):
    if risk_level == 'High':
        return [
            "Strictly track daily expenses for 30 days.",
            "Cut down non-essential discretionary spending immediately.",
            "Build a 1-month emergency fund before investing."
        ]
    elif risk_level == 'Medium':
        return [
            "Automate your savings transfer on payday.",
            "Review subscriptions and recurring bills.",
            "Aim to save at least 20% of your income."
        ]
    else:
        return [
            "Explore diversified investment portfolios.",
            "Maximize your retirement account contributions.",
            "Consider aggressive growth assets for long-term wealth."
        ]


# --- Endpoints (ML Model Prediction) ---
@app.get("/")
def home():
    return {"message": "Finance AI API is running", "docs": "http://127.0.0.1:8000/docs"}

@app.post("/predict")
def predict(finance_data: FinanceInput):
    if ml_artifacts.get('error'): raise HTTPException(500, "Artifacts not loaded")
    try:
        data = finance_data.model_dump(by_alias=True)
        
        # Format DataFrame exactly as the model expects
        expected_cols = ['Income', 'Age', 'Dependents', 'Occupation', 'City_Tier', 'Total_Expense', 'Desired_Savings']
        X_input = pd.DataFrame([data], columns=expected_cols)
        
        model = ml_artifacts['classification_model']
        
        # Predict Class
        prediction = model.predict(X_input)[0] 
        
        # Predict Probabilities
        probabilities = model.predict_proba(X_input)[0]
        classes = model.classes_ # Expected: ['Average', 'Bad', 'Good']
        prob_dict = {classes[i]: round(float(probabilities[i]), 4) for i in range(len(classes))}

        # Calculate Risk Level
        bad_prob = prob_dict.get('Bad', 0.0)
        if bad_prob > 0.6: risk = 'High'
        elif bad_prob > 0.3: risk = 'Medium'
        else: risk = 'Low'

        return {
            "financial_health": prediction,
            "probabilities": prob_dict,
            "risk_level": risk,
            "monthly_savings_potential": data['Income'] - data['Total_Expense']
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))

@app.post("/recommend")
def recommend(finance_data: FinanceInput):
    if ml_artifacts.get('error'): raise HTTPException(500, "Artifacts not loaded")
    try:
        # Use predict endpoint logic internally to get the risk level
        predict_result = predict(finance_data)
        risk = predict_result["risk_level"]
        savings = predict_result["monthly_savings_potential"]

        interventions = get_financial_recommendations(risk, savings)

        return {
            "risk_level": risk,
            "financial_health": predict_result["financial_health"],
            "recommended_actions": interventions
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))


# --- Endpoints (AI Chatbot and Finance Quiz Generation) ---

@app.post("/chat_with_advisor")
async def chat_with_advisor(request: ChatRequest):
    print(f"📩 Chat using model: {ACTIVE_MODEL_NAME}")
    prompt = f"""Act as a highly knowledgeable, encouraging, and friendly financial advisor. 
    Use emojis to make it engaging 📈💡. Keep answers concise and practical. 
    Context: {request.user_context}. 
    User Question: {request.message}"""
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME) 
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        print("❌ GEMINI ERROR:")
        traceback.print_exc()
        return {"reply": f"Sorry, my financial data stream is down. Error: {str(e)}"}

@app.post("/generate_full_test")
async def generate_full_test(req: TestRequest):
    print(f"📝 Generating {req.difficulty} finance quiz using model: {ACTIVE_MODEL_NAME}")
    
    count = 10 
    subject_prompt = req.test_type # e.g., "Investing Basics", "Budgeting", "Debt Management"

    prompt = f"""
    Create a {count}-question multiple-choice quiz about Personal Finance.
    Topic Focus: {subject_prompt}
    Difficulty: {req.difficulty}.
    Learning Context: {req.learning_context}
    
    Make the questions practical and scenario-based where possible.
    Respond ONLY in this exact JSON format:
    {{
        "questions": [
            {{
                "id": 1,
                "subject": "{req.test_type}",
                "question": "Question text...",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "Option A"
            }}
        ]
    }}
    """
    try:
        model = genai.GenerativeModel(ACTIVE_MODEL_NAME)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_text)
    except Exception as e:
        traceback.print_exc()
        return {"questions": []}

@app.post("/analyze_test_results")
async def analyze_test_results(res: TestResult):
    model_name = ACTIVE_MODEL_NAME
    prompt = f"""
    User scored {res.score}/{res.total_marks} on a finance quiz.
    Concepts they struggled with: {', '.join(res.wrong_answers[:5])}.
    Provide: 1. A short, encouraging feedback sentence. 2. A specific financial concept they should review.
    Respond strictly in JSON format: {{ "feedback": "...", "recommendation": "..." }}
    """
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_text)
    except Exception as e:
        return {"feedback": "Good effort analyzing your finances!", "recommendation": "Review the concepts you missed."}

@app.post("/generate_financial_plan")
async def generate_financial_plan(finance_data: FinanceInput):
    model_name = ACTIVE_MODEL_NAME
    data = finance_data.model_dump(by_alias=True)
    prompt = f"""Analyze this user's finances: 
    Income: {data['Income']}, Expenses: {data['Total_Expense']}, Savings Goal: {data['Desired_Savings']}, Age: {data['Age']}.
    Return strictly JSON format: 
    {{ 'analysis': 'Short text analysis', 'action_steps': ['step 1', 'step 2'], 'youtube_search_queries': ['query 1'] }}
    """
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_text)
    except Exception as e:
        return {}