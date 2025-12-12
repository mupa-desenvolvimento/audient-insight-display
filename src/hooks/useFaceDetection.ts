import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { usePeopleRegistry } from './usePeopleRegistry';
import { useDetectionLog } from './useDetectionLog';
import { useAttentionHistory } from './useAttentionHistory';

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
  lookingDuration: number; // Duration in seconds
  firstSeenAt: Date;
}

interface TrackedFace {
  descriptor: Float32Array;
  firstSeenAt: Date;
  lastSeenAt: Date;
  personId?: string;
  personName?: string;
  isRegistered: boolean;
  gender: 'masculino' | 'feminino' | 'indefinido';
  ageGroup: string;
  age: number;
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
  console.log('Gender detection:', { gender, genderProbability });
  
  if (gender === 'female') return 'feminino';
  if (gender === 'male') return 'masculino';
  return 'indefinido';
};

const FACE_MATCH_THRESHOLD = 0.5; // Threshold for matching same face across frames
const FACE_TIMEOUT_MS = 3000; // Remove tracked face after 3 seconds of not being seen

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
  const trackedFacesRef = useRef<Map<string, TrackedFace>>(new Map());
  
  const { registeredPeople } = usePeopleRegistry();
  const { logDetection } = useDetectionLog();
  const { addAttentionRecord } = useAttentionHistory();

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        
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

  // Find matching tracked face by descriptor
  const findMatchingTrackedFace = useCallback((descriptor: Float32Array): string | null => {
    const trackedFaces = trackedFacesRef.current;
    
    for (const [trackId, tracked] of trackedFaces.entries()) {
      try {
        const distance = faceapi.euclideanDistance(descriptor, tracked.descriptor);
        if (distance < FACE_MATCH_THRESHOLD) {
          return trackId;
        }
      } catch (error) {
        console.error('Error comparing face descriptors:', error);
      }
    }
    return null;
  }, []);

  // Update or create tracked face
  const updateTrackedFace = useCallback((
    trackId: string,
    descriptor: Float32Array,
    personId?: string,
    personName?: string,
    isRegistered: boolean = false,
    gender: 'masculino' | 'feminino' | 'indefinido' = 'indefinido',
    ageGroup: string = '',
    age: number = 0
  ) => {
    const now = new Date();
    const existing = trackedFacesRef.current.get(trackId);
    
    if (existing) {
      existing.lastSeenAt = now;
      existing.descriptor = descriptor;
    } else {
      trackedFacesRef.current.set(trackId, {
        descriptor,
        firstSeenAt: now,
        lastSeenAt: now,
        personId,
        personName,
        isRegistered,
        gender,
        ageGroup,
        age
      });
    }
  }, []);

  // Get looking duration for a tracked face
  const getLookingDuration = useCallback((trackId: string): { duration: number; firstSeenAt: Date } => {
    const tracked = trackedFacesRef.current.get(trackId);
    if (!tracked) {
      return { duration: 0, firstSeenAt: new Date() };
    }
    
    const duration = (tracked.lastSeenAt.getTime() - tracked.firstSeenAt.getTime()) / 1000;
    return { duration, firstSeenAt: tracked.firstSeenAt };
  }, []);

  // Clean up old tracked faces and save attention history
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const trackedFaces = trackedFacesRef.current;
      
      for (const [trackId, tracked] of trackedFaces.entries()) {
        if (now - tracked.lastSeenAt.getTime() > FACE_TIMEOUT_MS) {
          const duration = (tracked.lastSeenAt.getTime() - tracked.firstSeenAt.getTime()) / 1000;
          console.log(`Removing tracked face ${trackId} - duration: ${duration.toFixed(1)}s`);
          
          // Save to attention history
          addAttentionRecord(
            trackId,
            tracked.personId,
            tracked.personName,
            tracked.isRegistered,
            tracked.gender,
            tracked.ageGroup,
            tracked.age,
            tracked.firstSeenAt,
            tracked.lastSeenAt,
            duration
          );
          
          trackedFaces.delete(trackId);
        }
      }
    }, 1000);

    return () => clearInterval(cleanupInterval);
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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

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

            // Identify registered person
            let identifiedPerson = null;
            if (detection.descriptor) {
              for (const person of registeredPeople) {
                try {
                  const distance = faceapi.euclideanDistance(detection.descriptor, person.faceDescriptor);
                  if (distance < 0.6) {
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
            
            // Track face across frames
            let trackId: string;
            if (detection.descriptor) {
              const existingTrackId = findMatchingTrackedFace(detection.descriptor);
              
              if (existingTrackId) {
                trackId = existingTrackId;
                updateTrackedFace(trackId, detection.descriptor, isRegistered ? identifiedPerson?.id : undefined, isRegistered ? identifiedPerson?.name : undefined, isRegistered || false, gender, ageGroup, age);
              } else {
                trackId = isRegistered ? identifiedPerson!.id : `track_${Date.now()}_${index}`;
                updateTrackedFace(trackId, detection.descriptor, isRegistered ? identifiedPerson?.id : undefined, isRegistered ? identifiedPerson?.name : undefined, isRegistered || false, gender, ageGroup, age);
              }
            } else {
              trackId = `unknown_${Date.now()}_${index}`;
            }

            const { duration, firstSeenAt } = getLookingDuration(trackId);
            
            // Log registered person detection
            if (isRegistered && !lastDetectedPersonsRef.current.has(identifiedPerson!.id)) {
              logDetection(
                identifiedPerson!.id,
                identifiedPerson!.name,
                identifiedPerson!.cpf,
                identifiedPerson!.confidence
              );
              
              lastDetectedPersonsRef.current.add(identifiedPerson!.id);
              setTimeout(() => {
                lastDetectedPersonsRef.current.delete(identifiedPerson!.id);
              }, 5000);
            }

            console.log(`Face ${index + 1}: ${isRegistered ? identifiedPerson!.name : 'desconhecida'}, olhando há ${duration.toFixed(1)}s`);

            return {
              id: trackId,
              personId: isRegistered ? identifiedPerson!.id : undefined,
              name: isRegistered ? identifiedPerson!.name : undefined,
              cpf: isRegistered ? identifiedPerson!.cpf : undefined,
              timestamp: new Date(),
              gender,
              ageGroup,
              confidence: isRegistered ? identifiedPerson!.confidence : detection.detection.score,
              position: {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height
              },
              age,
              genderProbability,
              isRegistered: isRegistered || false,
              lookingDuration: duration,
              firstSeenAt
            };
          })
        );

        if (newFaces.length > 0) {
          setDetectedFaces(prev => {
            const combined = [...newFaces, ...prev];
            return combined.slice(0, 50);
          });
        }

        // Draw detections on canvas
        newFaces.forEach((face, index) => {
          const { position, isRegistered, name, gender, age, lookingDuration } = face;
          
          const colors = ['#00ff00', '#ff6600', '#0066ff', '#ff0066', '#66ff00', '#ff6600'];
          const color = isRegistered ? '#00ff00' : colors[index % colors.length];
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.font = '16px Arial';
          ctx.fillStyle = color;
          
          ctx.strokeRect(position.x, position.y, position.width, position.height);
          
          // Main label
          const label = isRegistered ? name : `${gender} | ${age} anos`;
          const labelY = position.y > 45 ? position.y - 28 : position.y + position.height + 25;
          
          const textWidth = ctx.measureText(label || '').width;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(position.x - 2, labelY - 18, textWidth + 4, 22);
          
          ctx.fillStyle = color;
          ctx.fillText(label || '', position.x, labelY);
          
          // Duration label
          const durationLabel = `⏱ ${lookingDuration.toFixed(1)}s`;
          const durationY = position.y > 45 ? position.y - 6 : position.y + position.height + 47;
          const durationWidth = ctx.measureText(durationLabel).width;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(position.x - 2, durationY - 18, durationWidth + 4, 22);
          
          ctx.fillStyle = '#ffcc00';
          ctx.fillText(durationLabel, position.x, durationY);
          
          // Face number
          ctx.fillStyle = color;
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`#${index + 1}`, position.x + 5, position.y + 18);
        });
      }
    } catch (error) {
      console.error('Error during face detection:', error);
    }
  }, [videoRef, canvasRef, isModelsLoaded, isActive, registeredPeople, logDetection, findMatchingTrackedFace, updateTrackedFace, getLookingDuration, addAttentionRecord]);

  // Start/stop detection based on isActive
  useEffect(() => {
    if (isActive && isModelsLoaded) {
      detectionIntervalRef.current = setInterval(detectFaces, 1000);
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
          Date.now() - face.timestamp.getTime() < 30000
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