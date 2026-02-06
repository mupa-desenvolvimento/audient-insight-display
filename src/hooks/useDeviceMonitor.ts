import { useRef, useEffect, useState } from 'react';
import { useFaceDetection, ActiveFace } from './useFaceDetection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDeviceMonitor = (deviceCode: string) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Always run detection if camera is available
  const { activeFaces } = useFaceDetection(videoRef, canvasRef, true);
  
  const lastKnownFacesRef = useRef<Map<string, ActiveFace>>(new Map());
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, facingMode: 'user' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays (sometimes needed for autoplay policies)
          videoRef.current.play().catch(e => console.log("Autoplay blocked/handled", e));
        }
      } catch (err) {
        console.warn("Camera access denied or not available:", err);
      }
    };
    
    startCamera();
    
    return () => {
      // Optional: Stop tracks if we want to release camera on unmount
      // const stream = videoRef.current?.srcObject as MediaStream;
      // stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // 2. Realtime Listener for Monitoring Request
  useEffect(() => {
    if (!deviceCode) return;

    const channel = supabase.channel(`device_monitor:${deviceCode}`)
      .on('broadcast', { event: 'start_stream' }, () => {
        setIsMonitoring(true);
        toast.info("Monitoramento remoto iniciado");
      })
      .on('broadcast', { event: 'stop_stream' }, () => {
        setIsMonitoring(false);
        toast.info("Monitoramento remoto finalizado");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceCode]);

  // 3. Send Stream Frames
  useEffect(() => {
    if (isMonitoring) {
      monitoringIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video && canvas && video.readyState === 4) {
            const context = canvas.getContext('2d');
            if (context) {
                // Downscale for bandwidth
                canvas.width = 320; 
                canvas.height = 240;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = canvas.toDataURL('image/jpeg', 0.6);
                
                supabase.channel(`device_monitor:${deviceCode}`).send({
                    type: 'broadcast',
                    event: 'frame',
                    payload: {
                        image: imageData,
                        stats: activeFaces,
                        timestamp: new Date().toISOString(),
                        meta: { width: video.videoWidth, height: video.videoHeight }
                    }
                });
            }
        }
      }, 500); // 2 FPS
    } else {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    }

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [isMonitoring, activeFaces, deviceCode]);

  // 4. Log Detection Logic (Persistence)
  useEffect(() => {
    const currentFaceIds = new Set(activeFaces.map(f => f.trackId));
    const lastKnown = lastKnownFacesRef.current;

    // Detect faces that left
    lastKnown.forEach((face, trackId) => {
      if (!currentFaceIds.has(trackId)) {
        // Log to Supabase
        if (face.lookingDuration >= 1) { // Only log if looked for 1s+
            // Using a raw fetch or Supabase client
            supabase.from('detection_logs').insert({
                device_code: deviceCode,
                age_group: face.ageGroup,
                gender: face.gender,
                emotion: face.emotion.emotion,
                attention_duration: face.lookingDuration,
                detected_at: new Date().toISOString()
            }).then(({ error }) => {
                if (error) console.error("Error logging detection:", error);
            });
        }
        lastKnown.delete(trackId);
      }
    });

    // Update current faces
    activeFaces.forEach(face => {
      lastKnown.set(face.trackId, face);
    });

  }, [activeFaces, deviceCode]);

  return { videoRef, canvasRef, isMonitoring };
};
