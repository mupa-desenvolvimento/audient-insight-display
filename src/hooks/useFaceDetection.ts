import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { usePeopleRegistry } from './usePeopleRegistry';

interface DetectedFace {
  id: string;
  personId?: string;
  name?: string;
  cpf?: string;
  timestamp: Date;
  gender: 'masculino' | 'feminino' | 'indefinido';
  ageGroup: '0-12' | '13-18' | '19-25' | '26-35' | '36-50' | '51+';
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
  age: number;
  genderProbability: number;
  isRegistered: boolean;
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
  // face-api.js: valores altos (próximo a 1) = masculino, valores baixos (próximo a 0) = feminino
  // Invertendo a lógica baseado no comportamento observado
  if (genderProbability > 0.6) return 'masculino';
  if (genderProbability < 0.4) return 'feminino';
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
  const lastDetectedPersonsRef = useRef<Set<string>>(new Set());
  
  const { identifyPerson } = usePeopleRegistry();

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
        // Identificar pessoas cadastradas
        const identifiedPerson = await identifyPerson(video);
        
        const newFaces: DetectedFace[] = detections.map((detection, index) => {
          const box = detection.detection.box;
          const age = Math.round(detection.age);
          const genderProbability = detection.genderProbability;
          const gender = getGender(genderProbability);
          const ageGroup = getAgeGroup(age);

          // Usar dados da pessoa identificada se disponível
          const isRegistered = identifiedPerson && !identifiedPerson.isNewPerson;
          const faceId = isRegistered ? identifiedPerson.id : `unknown_${Date.now()}_${index}`;
          
          // Evitar detectar a mesma pessoa repetidamente
          if (isRegistered && lastDetectedPersonsRef.current.has(identifiedPerson.id)) {
            return null;
          }

          if (isRegistered) {
            lastDetectedPersonsRef.current.add(identifiedPerson.id);
            // Limpar após 5 segundos para permitir nova detecção
            setTimeout(() => {
              lastDetectedPersonsRef.current.delete(identifiedPerson.id);
            }, 5000);
          }

          // Debug log para verificar os valores
          console.log(`Face detectada: ${isRegistered ? identifiedPerson.name : 'desconhecida'}, idade=${age}, genderProb=${genderProbability.toFixed(3)}, género=${gender}`);

          return {
            id: faceId,
            personId: isRegistered ? identifiedPerson.id : undefined,
            name: isRegistered ? identifiedPerson.name : undefined,
            cpf: isRegistered ? identifiedPerson.cpf : undefined,
            timestamp: new Date(),
            gender,
            ageGroup,
            confidence: isRegistered ? identifiedPerson.confidence : detection.detection.score,
            position: {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height
            },
            age,
            genderProbability,
            isRegistered: isRegistered || false
          };
        }).filter(Boolean) as DetectedFace[];

        if (newFaces.length > 0) {
          setDetectedFaces(prev => {
            const combined = [...newFaces, ...prev];
            return combined.slice(0, 20); // Keep only the 20 most recent
          });
        }

        // Draw detections on canvas
        newFaces.forEach((face) => {
          const { position, isRegistered, name, gender, age } = face;
          
          // Cor diferente para pessoas cadastradas
          ctx.strokeStyle = isRegistered ? '#00ff00' : '#ff6600';
          ctx.lineWidth = 2;
          ctx.font = '14px Arial';
          ctx.fillStyle = isRegistered ? '#00ff00' : '#ff6600';
          
          // Draw bounding box
          ctx.strokeRect(position.x, position.y, position.width, position.height);
          
          // Draw label
          const label = isRegistered ? name : `${gender} | ${age} anos`;
          const labelY = position.y > 20 ? position.y - 5 : position.y + position.height + 20;
          ctx.fillText(label, position.x, labelY);
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