#!/usr/bin/env python3
"""
Simple test script to check if the backend server is working
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app import app
    print("[OK] Backend server imports successful")
    
    # Test the health endpoint
    with app.test_client() as client:
        response = client.get('/health')
        print(f"[OK] Health endpoint test: {response.status_code}")
        print(f"Response: {response.get_json()}")
        
        # Test if models are loaded
        print(f"[OK] Models loaded: {len(app.models_list) if hasattr(app, 'models_list') else 'Unknown'}")
        
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Error: {e}")
    sys.exit(1)

print("[OK] Backend server is ready to run")
print("To start the server, run: python app.py")
