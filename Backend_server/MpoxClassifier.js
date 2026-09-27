import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://localhost:5000/predict';

const MpoxClassifier = () => {
  const [image, setImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setPrediction(null);
      setError(null);
    }
  };

  const predict = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: image,
        type: 'image/jpeg',
        name: 'image.jpg',
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPrediction(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderProbabilityBars = () => {
    if (!prediction?.all_probabilities) return null;

    return Object.entries(prediction.all_probabilities)
      .sort(([, a], [, b]) => b - a)
      .map(([className, probability]) => (
        <View key={className} style={styles.probabilityContainer}>
          <View style={styles.probabilityHeader}>
            <Text>{className}</Text>
            <Text>{(probability * 100).toFixed(2)}%</Text>
          </View>
          <View style={styles.probabilityBar}>
            <View
              style={[
                styles.probabilityFill,
                { width: `${probability * 100}%` },
              ]}
            />
          </View>
        </View>
      ));
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        <Text style={styles.buttonText}>Select Image</Text>
      </TouchableOpacity>

      {image && (
        <>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity
            style={styles.predictButton}
            onPress={predict}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Predicting...' : 'Predict'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      {error && <Text style={styles.error}>{error}</Text>}

      {prediction && (
        <View style={styles.resultContainer}>
          <Text style={styles.predictionText}>
            Prediction: {prediction.prediction}
          </Text>
          <Text style={styles.confidenceText}>
            Confidence: {(prediction.confidence * 100).toFixed(2)}%
          </Text>
          <Text style={styles.probabilitiesTitle}>All Probabilities:</Text>
          {renderProbabilityBars()}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  imageButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  predictButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    borderRadius: 10,
  },
  error: {
    color: 'red',
    marginVertical: 10,
  },
  resultContainer: {
    marginTop: 20,
  },
  predictionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  confidenceText: {
    fontSize: 16,
    marginBottom: 20,
  },
  probabilitiesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  probabilityContainer: {
    marginBottom: 10,
  },
  probabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  probabilityBar: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  probabilityFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
});

export default MpoxClassifier; 