# Skin Disease Analysis Backend Server

## Project Description

This is a **Flask-based REST API server** that uses deep learning models to analyze skin images and classify them into different skin conditions. The system uses an ensemble of 5 PyTorch models trained to identify various skin diseases including Chickenpox, Cowpox, Hand-Foot-Mouth Disease (HFMD), Measles, Monkeypox, and healthy skin.

### What This Server Does

- **Image Analysis**: Accepts skin images from users and analyzes them using AI models
- **Disease Classification**: Identifies 6 different conditions with confidence scores
- **Skin Detection**: Automatically detects if the uploaded image contains actual skin
- **Explainability**: Provides visual heatmaps showing which parts of the image contributed to the diagnosis
- **REST API**: Provides endpoints for prediction, explanation, and health checking

---

## Prerequisites

Before setting up the server, make sure you have:

- **Python 3.7+** installed on your computer
- **pip** (Python package installer)
- All 5 model files (`.pth` files) in the Backend_server directory

---

## Installation & Setup

### Step 1: Navigate to the Backend Server Directory

```bash
cd Backend_server
```

### Step 2: Create a Virtual Environment (Recommended)

**For Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**For Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- Flask (web server framework)
- Flask-CORS (handles cross-origin requests)
- PyTorch (deep learning framework)
- Pillow (image processing)
- NumPy (numerical computing)
- Matplotlib (visualization)
- OpenCV (image processing)
- Captum (model explainability)

### Step 4: Verify Model Files

Make sure these 5 model files are in the `Backend_server` directory:
- `mpox_model_fold_1.pth`
- `mpox_model_fold_2.pth`
- `mpox_model_fold_3.pth`
- `mpox_model_fold_4.pth`
- `mpox_model_fold_5.pth`

---

## Running the Server

### Start the Server

```bash
python app.py
```

You should see output like:
```
 * Running on http://0.0.0.0:5000
```

### Test if Server is Running

Open your browser and go to:
```
http://localhost:5000/health
```

You should see:
```json
{
  "status": "healthy",
  "message": "Server is running"
}
```

---

## API Endpoints

### 1. Health Check

**GET** `/health`

Check if the server is running.

**Response:**
```json
{
  "status": "healthy",
  "message": "Server is running"
}
```

### 2. Predict (Image Analysis)

**POST** `/predict`

Analyze a skin image and get a disease prediction.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with `image` field

**Response:**
```json
{
  "prediction": "Monkeypox",
  "confidence": 0.95,
  "all_probabilities": {
    "Chickenpox": 0.05,
    "Cowpox": 0.02,
    "HFMD": 0.03,
    "Healthy": 0.01,
    "Measles": 0.01,
    "Monkeypox": 0.95
  }
}
```

### 3. Explain (Visual Explanation)

**POST** `/explain`

Generate a visual heatmap showing which parts of the image contributed to the diagnosis.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: FormData with `image` field

**Response:**
```json
{
  "predicted_class": "Monkeypox",
  "confidence": 0.95,
  "heatmap_image": "base64_encoded_image_string"
}
```

---

## Configuration

### Change Skin Detection Sensitivity

You can adjust how strict the skin detection is by setting an environment variable:

**Windows:**
```bash
set MIN_SKIN_RATIO=0.15
python app.py
```

**Mac/Linux:**
```bash
export MIN_SKIN_RATIO=0.15
python app.py
```

Default value is `0.18` (18% of the image must be detected as skin).

Lower values = more lenient (may accept lower quality images)  
Higher values = stricter (requires more clear skin in image)

---

## Troubleshooting

### Server Won't Start

**Problem:** Port 5000 is already in use

**Solution:**
1. Find what's using port 5000:
   ```bash
   netstat -ano | findstr :5000
   ```
2. Kill that process, or change the port in `app.py`:
   ```python
   app.run(host='0.0.0.0', port=5001)  # Change to different port
   ```

### "No module named 'flask'"

**Problem:** Dependencies not installed

**Solution:**
```bash
pip install -r requirements.txt
```

### "FileNotFoundError: mpox_model_fold_X.pth"

**Problem:** Model files missing

**Solution:** Make sure all 5 `.pth` files are in the same directory as `app.py`

### "Out of memory" Error

**Problem:** Models too large for your computer's memory

**Solution:**
- Close other applications
- Ensure you have at least 4GB RAM available
- Consider running on a more powerful machine

---

## Testing the Server

You can test the server using a simple Python script:

```python
import requests

# Test health endpoint
response = requests.get('http://localhost:5000/health')
print(response.json())

# Test prediction (replace 'path/to/image.jpg' with actual image)
with open('path/to/image.jpg', 'rb') as f:
    files = {'image': f}
    response = requests.post('http://localhost:5000/predict', files=files)
    print(response.json())
```

---

## Architecture

### How It Works

1. **Multiple Models (Ensemble)**: Uses 5 different models and averages their predictions for better accuracy
2. **Skin Detection**: First checks if the image contains actual skin (to avoid analyzing non-skin images)
3. **Deep Learning**: Uses ResNet18 backbone with custom attention mechanisms
4. **Explainability**: Uses LRP (Layer-wise Relevance Propagation) to show which parts of the image influenced the diagnosis

### Model Architecture

- Base: ResNet18 (pre-trained on ImageNet)
- Custom: Enhanced dot-product attention mechanism
- Output: 6 classes (Chickenpox, Cowpox, HFMD, Healthy, Measles, Monkeypox)

---

## Deployment

### For Development

The default setup is fine for development and local network access.

### For Production

Consider:
- Using a production WSGI server like Gunicorn
- Setting up proper security (HTTPS)
- Implementing rate limiting
- Adding authentication
- Using environment variables for sensitive configuration

---

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify all dependencies are installed
3. Ensure model files are present
4. Test with the `/health` endpoint first

---

## License

This is part of the Skin Analyze project for educational and research purposes.