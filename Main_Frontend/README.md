# Skin Analyze Mobile App

## Project Description

**Skin Analyze** is a React Native mobile application that helps users identify skin conditions by analyzing photos of their skin. The app uses AI-powered image analysis to detect and classify various skin diseases, providing users with instant diagnostic information, treatment recommendations, and detailed AI-generated explanations.

### What This App Does

- **Camera & Gallery Integration**: Take photos or select from gallery
- **Skin Disease Detection**: Analyzes images to identify 6 different conditions (Monkeypox, Chickenpox, Measles, Cowpox, HFMD, or Healthy skin)
- **AI-Powered Analysis**: Provides detailed explanations using Google's Gemini AI
- **Treatment Recommendations**: Gets personalized treatment plans for detected conditions
- **Visual Explainability**: Shows heatmaps highlighting important areas of the skin image
- **User Authentication**: Secure login system using Firebase
- **History Tracking**: Saves analysis history for future reference
- **Patient Monitoring**: Track health progress over time

---

## Prerequisites

Before setting up the app, make sure you have:

- **Node.js** (v16 or higher) installed
- **npm** or **yarn** package manager
- **Expo CLI** installed globally
- **Expo Go** app on your smartphone (for testing)
- **Firebase project** configured (for authentication and database)
- **Backend server running** (the Flask API server)

---

## Installation & Setup

### Step 1: Navigate to the Frontend Directory

```bash
cd Main_Frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React Native and Expo
- Firebase SDK
- Navigation libraries
- Image processing libraries
- UI components

### Step 3: Configure Firebase (Important!)

The app uses Firebase for authentication and database. You need to:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. The configuration is already set in `lib/config/firebase.ts`

### Step 4: Configure environment variables

Copy the example file and fill in your own values. Do not commit `.env`.

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:5000
EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
```

Use your computer's LAN address so a phone on the same Wi-Fi can reach the Flask server. On Windows, find it with `ipconfig`.

### Step 5: Start the Development Server

```bash
npm start
```

This will start the Expo development server and show a QR code.

---

## Running the App

### Option 1: Expo Go (Recommended for Development)

1. Install **Expo Go** app on your smartphone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code from your terminal with:
   - **iOS**: Use Camera app
   - **Android**: Use Expo Go app

3. Make sure your phone and computer are on the **same WiFi network**

### Option 2: Android Emulator

```bash
npm run android
```

Requires Android Studio and an emulator setup.

### Option 3: iOS Simulator (Mac only)

```bash
npm run ios
```

Requires Xcode and iOS simulator.

---

## App Features

### 1. Authentication
- Sign up with email and password
- Login/Logout
- Password reset
- Secure session management

### 2. Image Analysis
- **Upload Image**: Choose from gallery or take a photo
- **Analyze**: AI identifies skin condition
- **View Results**: See prediction with confidence scores
- **Get Details**: AI-generated detailed explanation

### 3. Treatment Recommendations
- Personalized treatment plans
- Home remedies and medical advice
- Prevention tips
- When to seek professional help

### 4. Visual Explainability
- **Heatmap Visualization**: Shows which areas influenced the diagnosis
- Color-coded regions:
  - Red: High confidence disease indicators
  - Orange: Moderate indicators
  - Yellow: Low confidence
  - Green: Healthy skin
  - Blue: Background areas

### 5. History & Tracking
- Save analysis history
- View past diagnoses
- Track progress over time

### 6. Chat & Support
- Ask questions about skin health
- Get instant guidance
- Educational information

---

## App Structure

```
Main_Frontend/
├── app/                    # Screen pages
│   ├── login.tsx          # Login screen
│   ├── signup.tsx         # Signup screen
│   ├── home.tsx           # Main dashboard
│   ├── analyze.tsx        # Image analysis page
│   ├── history.tsx        # Analysis history
│   └── ...
├── components/            # Reusable components
├── lib/                   # Utilities
│   ├── config/           # Firebase config
│   └── utils/            # Helper functions
├── assets/                # Images and icons
└── package.json          # Dependencies
```

---

## Troubleshooting

### App Won't Connect to Server

**Problem:** "Cannot connect to server" error

**Solution:**
1. Make sure backend server is running (`python app.py` in Backend_server)
2. Verify API_URL is correct in `app/analyze.tsx`
3. Check your computer's firewall isn't blocking port 5000
4. Ensure phone and computer are on the same network

### "Network request failed"

**Problem:** Can't reach the backend server

**Solution:**
1. Test server health: Open `http://YOUR_IP:5000/health` in browser
2. If browser can access it but phone can't, check firewall settings
3. Try using your computer's IP address instead of `localhost`

### Expo Go Installation Issues

**Problem:** Can't install or run Expo Go

**Solution:**
- Make sure your phone is compatible (iOS 11+ or Android 5+)
- Try closing and reopening the Expo Go app
- Restart the Expo development server: `npm start`

### Firebase Configuration Errors

**Problem:** "Firebase: Error" messages

**Solution:**
1. Verify Firebase project is set up correctly
2. Check Firebase console for any errors
3. Ensure authentication is enabled in Firebase console
4. Verify Firestore database is created and rules are set

### Build Errors

**Problem:** `npm install` fails

**Solution:**
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules
npm install
```

---

## Running Backend Server with This App

The mobile app needs the backend server to be running. Follow these steps:

### Step 1: Start Backend Server

In a separate terminal:
```bash
cd Backend_server
python app.py
```

### Step 2: Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```

### Step 3: Update API URL in App

Edit `Main_Frontend/app/analyze.tsx`:
```typescript
const API_URL = 'http://192.168.1.100:5000';  // Your actual IP
```

### Step 4: Start the Mobile App

```bash
npm start
```

---

## Key Files

### Configuration Files

- `package.json` - Project dependencies
- `app.json` - Expo configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Styling configuration

### Main Screens

- `app/login.tsx` - User login
- `app/signup.tsx` - User registration
- `app/home.tsx` - Main dashboard
- `app/analyze.tsx` - Image analysis (main feature)
- `app/history.tsx` - Past analyses
- `app/chat.tsx` - Chat support

---

## Technologies Used

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **Firebase** - Authentication & Database
- **Tailwind CSS** - Styling
- **Expo Router** - Navigation
- **Axios** - HTTP requests
- **Expo Camera** - Camera access
- **Expo Image Picker** - Image selection

---

## Environment Variables

To use API keys securely, create a `.env` file:

```
GEMINI_API_KEY=your_key_here
BACKEND_API_URL=http://your_ip:5000
```

Then install:
```bash
npm install react-native-dotenv
```

---

## Production Build

### Android

```bash
eas build --platform android
```

### iOS

```bash
eas build --platform ios
```

(Requires Expo Application Services account)

---

## Support

### Common Issues

1. **Metro bundler errors**: Clear cache with `npm start --clear`
2. **Can't connect to server**: Check network, firewall, and IP address
3. **Camera permissions**: Grant camera permissions in phone settings
4. **App crashes on start**: Check Firebase configuration and API keys

### Getting Help

- Check the console for error messages
- Test backend server independently
- Verify network connectivity
- Review Firebase console for issues

---

## License

This is part of the Skin Analyze project for educational and research purposes.

