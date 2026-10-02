# Skinalyze AI

Mobile app and API for classifying skin conditions from a photo. The model covers chickenpox, cowpox, hand-foot-and-mouth disease, measles, monkeypox, and healthy skin. A separate language-model step explains the result and drafts follow-up notes. This is a student research project, not a medical device.

## See it working

### Home
![Skinalyze AI home screen](screenshots/home.png)

### Sign up
![Create an account](screenshots/signup.png)

### Analyze a photo
![Choose a skin photo from the gallery or camera](screenshots/analyze.png)

### Prediction
![Diagnosis result for chickenpox with a confidence score](screenshots/prediction.png)

### History
![Saved predictions and account history](screenshots/history.png)

### Monitoring
![Follow-up report for a chickenpox case](screenshots/monitoring.png)

### About skin diseases
![Information page for skin conditions the app can detect](screenshots/about.png)

### AI assistant
![Chat answer about what causes acne](screenshots/chat.png)

### Feedback
![Feedback form for predictions, treatment, and monitoring](screenshots/feedback.png)

## What it does

- Classifies a skin photo with an ensemble of five PyTorch models
- Returns a class and a confidence score, plus a heatmap of the regions that influenced the result
- Stores each signed-in user's history in Firebase
- Tracks follow-up visits and can export a PDF report
- Answers general dermatology questions through a chat screen

## Stack

- React Native and Expo for the mobile app
- Firebase Authentication and Firestore
- Flask and PyTorch for the analysis API

## Layout

- `Main_Frontend` — mobile app. Setup is in [Main_Frontend/README.md](Main_Frontend/README.md).
- `Backend_server` — analysis API. Setup is in [Backend_server/README.md](Backend_server/README.md).

API keys stay in a local `.env` file. Copy `Main_Frontend/.env.example` and add your own Gemini key. Do not commit that file.
