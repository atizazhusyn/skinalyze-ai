import torch
import torch.nn as nn
import torchvision.models as models
from flask import Flask, request, jsonify
import os
from flask_cors import CORS
from PIL import Image
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import cv2
import io
import numpy as np
from scipy import ndimage
from torchvision import transforms
from typing import Tuple
from captum.attr import LRP, visualization as viz

app = Flask(__name__)
CORS(app)
# Configurable skin threshold (0..1). Use env MIN_SKIN_RATIO, default 0.18
def _read_min_skin_ratio() -> float:
	val = os.getenv('MIN_SKIN_RATIO', '0.18')
	try:
		f = float(val)
		if f < 0.0:
			return 0.0
		if f > 1.0:
			return 1.0
		return f
	except Exception:
		return 0.18

MIN_SKIN_RATIO = _read_min_skin_ratio()
# --- Utility: simple skin detection using HSV + YCbCr heuristics ---
def _estimate_skin_ratio(pil_image: Image.Image) -> float:
	"""Return approximate ratio of skin pixels in the image.

	Uses basic color heuristics in HSV and YCbCr spaces. This is a lightweight
	gate to avoid running classification on non-skin photos.
	"""
	# Ensure RGB
	img_rgb = pil_image.convert('RGB')
	# Downscale for speed and to reduce noise
	max_side = 512
	if max(img_rgb.size) > max_side:
		w, h = img_rgb.size
		scale = max_side / float(max(w, h))
		img_rgb = img_rgb.resize((int(w * scale), int(h * scale)))

	# Convert to HSV and YCbCr
	img_hsv = img_rgb.convert('HSV')
	img_ycc = img_rgb.convert('YCbCr')

	# To numpy
	hsv = np.array(img_hsv, dtype=np.uint8)
	ycc = np.array(img_ycc, dtype=np.uint8)

	H = hsv[..., 0].astype(np.int32)
	S = hsv[..., 1].astype(np.int32)
	V = hsv[..., 2].astype(np.int32)
	Y = ycc[..., 0].astype(np.int32)
	Cb = ycc[..., 1].astype(np.int32)
	Cr = ycc[..., 2].astype(np.int32)

	# Heuristic skin rules
	# HSV rule: typical skin has moderate saturation and value
	mask_hsv = (S >= 40) & (S <= 200) & (V >= 60) & (V <= 255)

	# YCbCr rule: popular thresholds for skin clustering
	mask_ycc = (Y > 16) & (Cb >= 77) & (Cb <= 127) & (Cr >= 133) & (Cr <= 173)

	mask = mask_hsv & mask_ycc
	skin_pixels = int(mask.sum())
	total_pixels = int(mask.size)
	if total_pixels == 0:
		return 0.0
	return float(skin_pixels) / float(total_pixels)


# Define the model architecture
class EnhancedDotAttention(nn.Module):
    def __init__(self, in_channels):
        super().__init__()
        self.query = nn.Conv2d(in_channels, in_channels // 8, kernel_size=1)
        self.key = nn.Conv2d(in_channels, in_channels // 8, kernel_size=1)
        self.value = nn.Conv2d(in_channels, in_channels, kernel_size=1)
        self.gamma = nn.Parameter(torch.zeros(1))
        self.softmax = nn.Softmax(dim=-1)
        self.dropout = nn.Dropout(0.3)

    def forward(self, x):
        B, C, H, W = x.size()
        q = self.dropout(self.query(x).view(B, -1, H*W).permute(0, 2, 1))
        k = self.dropout(self.key(x).view(B, -1, H*W))
        v = self.dropout(self.value(x).view(B, -1, H*W))
        attention = torch.bmm(q, k)
        attention = self.softmax(attention / (C ** 0.5))
        out = torch.bmm(v, attention.permute(0, 2, 1))
        out = out.view(B, C, H, W)
        return self.gamma * out + x

class MpoxCNN(nn.Module):
    def __init__(self, num_classes=6):
        super().__init__()
        self.base_model = models.resnet18(pretrained=True)
        in_features = self.base_model.fc.in_features
        self.features = nn.Sequential(*list(self.base_model.children())[:-2])
        self.attention = EnhancedDotAttention(512)
        self.dropout = nn.Dropout(0.3)
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes)
        )
        self._initialize_weights()

    def _initialize_weights(self):
        for m in self.classifier:
            if isinstance(m, nn.Linear):
                nn.init.xavier_normal_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, x):
        x = self.features(x)
        x = self.attention(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        x = self.classifier(x)
        return x

# Initialize models
models_list = []
for i in range(1, 6):
    model = MpoxCNN()
    model.load_state_dict(torch.load(f'mpox_model_fold_{i}.pth', map_location=torch.device('cpu')))
    model.eval()
    models_list.append(model)

# Define class names
class_names = ['Chickenpox', 'Cowpox', 'HFMD', 'Healthy', 'Measles', 'Monkeypox']

# Define image transformation
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'Server is running'})

@app.route('/predict', methods=['POST'])
def predict():
    print("Received prediction request")
    print("Request files:", request.files)
    print("Request form:", request.form)
    
    if 'image' not in request.files:
        print("No image file in request")
        return jsonify({'error': 'No image provided'}), 400
    
    try:
        # Read and preprocess image
        image_file = request.files['image']
        image_bytes = image_file.read()
        image = Image.open(io.BytesIO(image_bytes))

        # Skin detection gate: reject if not enough skin content
        skin_ratio = _estimate_skin_ratio(image)
        if skin_ratio < MIN_SKIN_RATIO:
            return jsonify({'error': 'No skin detected. Please capture a clear, well-lit photo of skin closer to the camera.'}), 400

        image_tensor = transform(image).unsqueeze(0)

        # Get predictions from all models
        all_predictions = []
        with torch.no_grad():
            for model in models_list:
                outputs = model(image_tensor)
                probabilities = torch.softmax(outputs, dim=1)
                all_predictions.append(probabilities.numpy())

        # Average predictions from all models
        avg_predictions = np.mean(all_predictions, axis=0)
        predicted_class_idx = np.argmax(avg_predictions)
        predicted_class = class_names[predicted_class_idx]
        confidence = float(avg_predictions[0][predicted_class_idx])

        result = {
            'prediction': predicted_class,
            'confidence': confidence,
            'all_probabilities': {
                class_name: float(prob) 
                for class_name, prob in zip(class_names, avg_predictions[0])
            }
        }
        print("Prediction result:", result)
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/explain', methods=['POST'])
def explain():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    try:
        image_file = request.files['image']
        image_bytes = image_file.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        # Skin detection gate same as predict
        skin_ratio = _estimate_skin_ratio(pil_image)
        if skin_ratio < MIN_SKIN_RATIO:
            return jsonify({'error': 'No skin detected. Please capture a clear, well-lit photo of skin closer to the camera.'}), 400

        image_tensor = transform(pil_image).unsqueeze(0)

        # Use the first ensemble model for explanations (could average, but LRP on one is faster)
        model = models_list[0]
        model.zero_grad()
        
        # Ensure the model is in the correct state for attribution
        for param in model.parameters():
            param.requires_grad = True

        with torch.no_grad():
            logits = model(image_tensor)
            probs = torch.softmax(logits, dim=1)
            pred_idx = int(torch.argmax(probs, dim=1).item())
            confidence = float(probs[0, pred_idx].item())
            predicted_class = class_names[pred_idx]

        # Captum LRP for predicted class
        # Set model to eval mode and ensure gradients are enabled for attribution
        model.eval()
        image_tensor.requires_grad_(True)
        
        try:
            # Try LRP first
            lrp = LRP(model)
            attributions = lrp.attribute(image_tensor, target=pred_idx)
        except Exception as lrp_error:
            print(f"LRP failed: {lrp_error}")
            try:
                # Fallback to Integrated Gradients if LRP fails
                from captum.attr import IntegratedGradients
                ig = IntegratedGradients(model)
                attributions = ig.attribute(image_tensor, target=pred_idx, n_steps=50)
            except Exception as ig_error:
                print(f"Integrated Gradients failed: {ig_error}")
                # Final fallback to GradientShap
                from captum.attr import GradientShap
                gs = GradientShap(model)
                baseline = torch.zeros_like(image_tensor)
                attributions = gs.attribute(image_tensor, baselines=baseline, target=pred_idx)

        # Convert relevance to heatmap
        attr = attributions.squeeze(0).detach().cpu().numpy()  # CxHxW
        attr = np.transpose(attr, (1, 2, 0))  # HxWxC
        # Aggregate across channels using absolute values to capture both positive and negative relevance
        attr_gray = np.abs(attr).mean(axis=2)

        # Get original image dimensions
        orig = np.array(pil_image)
        orig_h, orig_w = orig.shape[:2]
        
        # Apply Gaussian smoothing to reduce roughness before resizing
        # This helps create a smoother heatmap
        attr_smooth = ndimage.gaussian_filter(attr_gray, sigma=1.0)
        
        # Use percentile-based normalization with less aggressive clipping
        # This preserves more detail while still emphasizing important areas
        attr_flat = attr_smooth.flatten()
        p99 = np.percentile(attr_flat, 99)  # Use 99th instead of 95th for less clipping
        p1 = np.percentile(attr_flat, 1)    # Use 1st instead of 5th for less clipping
        
        # Clip values and normalize
        if p99 - p1 > 1e-8:
            attr_clipped = np.clip(attr_smooth, p1, p99)
            attr_norm = (attr_clipped - p1) / (p99 - p1)
        else:
            attr_min, attr_max = np.min(attr_smooth), np.max(attr_smooth)
            if attr_max - attr_min > 1e-8:
                attr_norm = (attr_smooth - attr_min) / (attr_max - attr_min)
            else:
                attr_norm = np.zeros_like(attr_smooth)
        
        # Apply gentler gamma correction for smoother visualization
        gamma = 0.7  # Higher gamma = smoother, less harsh transitions
        attr_norm = np.power(attr_norm, gamma)
        
        # Resize heatmap back to original image size using cubic interpolation for smoother results
        # INTER_CUBIC provides better quality than default linear interpolation
        heatmap = cv2.resize(attr_norm, (orig_w, orig_h), interpolation=cv2.INTER_CUBIC)
        
        # Apply additional smoothing after resize to reduce any remaining roughness
        heatmap = ndimage.gaussian_filter(heatmap, sigma=0.5)
        
        # Normalize again after smoothing to ensure 0-1 range
        if heatmap.max() > heatmap.min():
            heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min())
        
        heatmap_uint8 = np.uint8(255 * heatmap)
        heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

        # Overlay heatmap on image with lower opacity to make original picture more visible
        # Reduced heatmap opacity from 0.7 to 0.4, increased original from 0.3 to 0.6
        overlay = cv2.addWeighted(heatmap_color, 0.4, cv2.cvtColor(orig, cv2.COLOR_RGB2BGR), 0.6, 0)
        overlay_rgb = cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB)

        # Encode to base64
        fig = plt.figure(frameon=False)
        plt.axis('off')
        plt.imshow(overlay_rgb)
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
        plt.close(fig)
        buf.seek(0)
        b64_str = base64.b64encode(buf.read()).decode('utf-8')

        return jsonify({
            'predicted_class': predicted_class,
            'confidence': confidence,
            'heatmap_image': b64_str
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 