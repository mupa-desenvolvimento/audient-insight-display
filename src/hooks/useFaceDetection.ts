import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface DetectedFace {
  id: string;
  timestamp: Date;
  gender: 'masculino' | 'feminino' | 'indefinido';
  ageGroup: '0-12' | '13-18' | '19-25' | '26-35' | '36-50' | '51+';
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
  age: number;
  genderProbability: number;
}

const getAgeGroup = (age: number): '0-12' | '13-18' | '19-25' | '26-35' | '36-50' | '51+' => {
  if (age <= 12) return '0-12';
  if (age <= 18) return '13-18';
  if (age <= 25) return '19-25';
  if (age <= 35) return '26-35';
  if (age <= 50) return '36-50';
  return '51+';
};

const getGender = (genderProbability: number): 'masculino' | 'feminino' | 'indefinido' => {
  if (genderProbability < 0.3) return 'masculino';
  if (genderProbability > 0.7) return 'feminino';
  return 'indefinido';
};

export const useFaceDetection = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isActive: boolean
) => {
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        
        // Load required models from CDN
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        setIsModelsLoaded(true);
        console.log('Face-api.js models loaded successfully');
      } catch (error) {
        console.error('Error loading face-api.js models:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const detectFaces = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded || !isActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    try {
      // Resize canvas to match video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Detect faces with age and gender
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withAgeAndGender();

      if (detections.length > 0) {
        const newFaces: DetectedFace[] = detections.map((detection, index) => {
          const box = detection.detection.box;
          const age = Math.round(detection.age);
          const genderProbability = detection.genderProbability;
          const gender = getGender(genderProbability);
          const ageGroup = getAgeGroup(age);

          return {
            id: `face_${Date.now()}_${index}`,
            timestamp: new Date(),
            gender,
            ageGroup,
            confidence: detection.detection.score,
            position: {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height
            },
            age,
            genderProbability
          };
        });

        setDetectedFaces(prev => {
          const combined = [...newFaces, ...prev];
          return combined.slice(0, 20); // Keep only the 20 most recent
        });

        // Draw detections on canvas
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.font = '14px Arial';
        ctx.fillStyle = '#00ff00';

        detections.forEach((detection, index) => {
          const box = detection.detection.box;
          const age = Math.round(detection.age);
          const gender = getGender(detection.genderProbability);
          
          // Draw bounding box
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Draw label
          const label = `${gender} | ${age} anos`;
          const labelY = box.y > 20 ? box.y - 5 : box.y + box.height + 20;
          ctx.fillText(label, box.x, labelY);
        });
      }
    } catch (error) {
      console.error('Error during face detection:', error);
    }
  }, [videoRef, canvasRef, isModelsLoaded, isActive]);

  // Start/stop detection based on isActive
  useEffect(() => {
    if (isActive && isModelsLoaded) {
      detectionIntervalRef.current = setInterval(detectFaces, 1000); // Detect every second
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isActive, isModelsLoaded, detectFaces]);

  // Clean up old detections
  useEffect(() => {
    const cleanup = setInterval(() => {
      setDetectedFaces(prev => 
        prev.filter(face => 
          Date.now() - face.timestamp.getTime() < 30000 // Remove after 30 seconds
        )
      );
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  return {
    isModelsLoaded,
    isLoading,
    detectedFaces,
    totalDetected: detectedFaces.length
  };
};