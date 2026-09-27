# Image Analysis Debugging Guide

## Current Issue: Image Analysis Keeps Loading

### Possible Causes and Solutions:

#### 1. **Backend Server Not Running**
- **Check**: Is the Flask server running on port 5000?
- **Solution**: Start the backend server:
  ```bash
  cd Backend_server
  python app.py
  ```
- **Expected Output**: Server should show "Running on http://0.0.0.0:5000"

#### 2. **Network Connectivity Issues**
- **Check**: Can the mobile device reach the backend server?
- **Current API URL**: `http://192.168.100.146:5000`
- **Solution**: 
  - Verify the IP address is correct
  - Test with: `curl http://192.168.100.146:5000/health`
  - Make sure both devices are on the same network

#### 3. **Image Upload Issues**
- **Check**: Is the image being sent correctly?
- **Debug**: Check console logs in the mobile app
- **Solution**: The updated code now includes detailed logging

#### 4. **FormData Issues in React Native**
- **Check**: Is the image data being formatted correctly?
- **Solution**: The updated code now handles FormData properly

### Debugging Steps:

#### Step 1: Check Backend Server
```bash
cd Backend_server
python test_server.py
```
Should show: `[OK] Backend server is ready to run`

#### Step 2: Start Backend Server
```bash
cd Backend_server
python app.py
```
Should show: `Running on http://0.0.0.0:5000`

#### Step 3: Test Health Endpoint
Open browser and go to: `http://192.168.100.146:5000/health`
Should show: `{"status": "healthy", "message": "Server is running"}`

#### Step 4: Check Mobile App Logs
- Open React Native debugger
- Look for console logs when analyzing image
- Check for network errors or timeout issues

### Updated Code Features:

#### Frontend (analyze.tsx):
- ✅ Added detailed console logging
- ✅ Added server connectivity test
- ✅ Added request timeout (30 seconds)
- ✅ Improved error handling
- ✅ Better FormData handling

#### Backend (app.py):
- ✅ Added health endpoint
- ✅ Added request debugging logs
- ✅ Added response debugging logs

### Common Solutions:

#### If "Network request failed":
1. Check if backend server is running
2. Verify IP address in API_URL
3. Check firewall settings
4. Ensure both devices are on same network

#### If "Request timed out":
1. Check if backend server is processing
2. Check server logs for errors
3. Try with a smaller image
4. Check network stability

#### If "No image provided":
1. Check image selection in mobile app
2. Verify image URI is valid
3. Check FormData formatting

### Testing the Fix:

1. **Start Backend Server**:
   ```bash
   cd Backend_server
   python app.py
   ```

2. **Test Health Endpoint**:
   - Open browser: `http://192.168.100.146:5000/health`
   - Should return: `{"status": "healthy", "message": "Server is running"}`

3. **Test Image Analysis**:
   - Select an image in the mobile app
   - Click "Analyze Image"
   - Check console logs for detailed debugging info
   - Should see: "Starting image analysis...", "Server is reachable", etc.

### Expected Console Output:
```
Starting image analysis...
Selected image URI: file:///...
API URL: http://192.168.100.146:5000
Testing server connection to: http://192.168.100.146:5000/health
Server is reachable
Sending request to: http://192.168.100.146:5000/predict
Response status: 200
Raw response: {"prediction": "Mpox", "confidence": 0.85, ...}
Analysis result: {...}
```

### If Still Not Working:

1. **Check IP Address**: Make sure `192.168.100.146` is correct
2. **Check Port**: Make sure port 5000 is not blocked
3. **Check Network**: Ensure both devices are on same WiFi
4. **Check Firewall**: Disable Windows Firewall temporarily
5. **Try Different IP**: Use `localhost` or `127.0.0.1` if testing on same machine

### Alternative API URLs to Try:
- `http://localhost:5000` (if testing on same machine)
- `http://127.0.0.1:5000` (if testing on same machine)
- `http://[YOUR_ACTUAL_IP]:5000` (replace with your actual IP)

### Getting Your IP Address:
- Windows: `ipconfig`
- Look for "IPv4 Address" under your WiFi adapter
- Use that IP instead of `192.168.100.146`
