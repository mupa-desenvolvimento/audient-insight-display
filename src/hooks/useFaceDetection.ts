import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { usePeopleRegistry } from './usePeopleRegistry';
import { useDetectionLog } from './useDetectionLog';

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

const getGender = (gender: string, genderProbability: number): 'masculino' | 'feminino' | 'indefinido' => {
  // face-api.js retorna 'male' ou 'female' na propriedade gender
  // e genderProbability indica a confiança dessa predição
  console.log('Gender detection:', { gender, genderProbability });
  
  if (gender === 'female') return 'feminino';
  if (gender === 'male') return 'masculino';
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
  
  const { registeredPeople } = usePeopleRegistry();
  const { logDetection } = useDetectionLog();

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

      // Detect faces with age, gender and descriptors
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withAgeAndGender();

      if (detections.length > 0) {
        console.log(`Detectando ${detections.length} face(s)`);
        
        const newFaces: DetectedFace[] = await Promise.all(
          detections.map(async (detection, index) => {
            const box = detection.detection.box;
            const age = Math.round(detection.age);
            const genderProbability = detection.genderProbability;
            const genderString = detection.gender;
            const gender = getGender(genderString, genderProbability);
            const ageGroup = getAgeGroup(age);

            // Identificar esta face específica usando seu descriptor
            let identifiedPerson = null;
            if (detection.descriptor) {
              // Verificar se esta face corresponde a alguma pessoa cadastrada
              for (const person of registeredPeople) {
                try {
                  const distance = faceapi.euclideanDistance(detection.descriptor, person.faceDescriptor);
                  if (distance < 0.6) { // Threshold para considerar como mesma pessoa
                    identifiedPerson = {
                      id: person.id,
                      name: person.name,
                      cpf: person.cpf,
                      confidence: 1 - distance,
                      isNewPerson: false
                    };
                    break;
                  }
                } catch (error) {
                  console.error('Erro ao comparar face descriptor:', error);
                }
              }
            }

            const isRegistered = identifiedPerson && !identifiedPerson.isNewPerson;
            const faceId = isRegistered ? identifiedPerson.id : `unknown_${Date.now()}_${index}`;
            
            // Evitar log repetido da mesma pessoa
            if (isRegistered && !lastDetectedPersonsRef.current.has(identifiedPerson.id)) {
              // Registrar a detecção no log
              logDetection(
                identifiedPerson.id,
                identifiedPerson.name,
                identifiedPerson.cpf,
                identifiedPerson.confidence
              );
              
              lastDetectedPersonsRef.current.add(identifiedPerson.id);
              // Limpar após 5 segundos para permitir nova detecção
              setTimeout(() => {
                lastDetectedPersonsRef.current.delete(identifiedPerson.id);
              }, 5000);
            }

            // Debug log
            console.log(`Face ${index + 1}: ${isRegistered ? identifiedPerson.name : 'desconhecida'}, idade=${age}, género=${gender}`);

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
          })
        );

        if (newFaces.length > 0) {
          setDetectedFaces(prev => {
            const combined = [...newFaces, ...prev];
            return combined.slice(0, 50); // Aumentei para 50 para suportar mais faces
          });
        }

        // Draw detections on canvas
        newFaces.forEach((face, index) => {
          const { position, isRegistered, name, gender, age } = face;
          
          // Cores diferentes para cada face
          const colors = ['#00ff00', '#ff6600', '#0066ff', '#ff0066', '#66ff00', '#ff6600'];
          const color = isRegistered ? '#00ff00' : colors[index % colors.length];
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.font = '16px Arial';
          ctx.fillStyle = color;
          
          // Draw bounding box
          ctx.strokeRect(position.x, position.y, position.width, position.height);
          
          // Draw label with background
          const label = isRegistered ? name : `${gender} | ${age} anos`;
          const labelY = position.y > 25 ? position.y - 8 : position.y + position.height + 25;
          
          // Background for text
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(position.x - 2, labelY - 18, textWidth + 4, 22);
          
          // Text
          ctx.fillStyle = color;
          ctx.fillText(label, position.x, labelY);
          
          // Número da face no canto superior esquerdo
          ctx.fillStyle = color;
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`#${index + 1}`, position.x + 5, position.y + 18);
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