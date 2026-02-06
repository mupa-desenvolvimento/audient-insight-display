import { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import { Loader2, Camera, Scan, Sparkles, Smile, Frown, User, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

// --- PRODUCT DATA ---
// Data structure: Gender -> Mood -> Products (with Age ranges)
const PRODUCTS = {
  female: {
    good: [
      { id: 1, name: "Batom Matte", category: "Beleza", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9", minAge: 20, maxAge: 30 },
      { id: 2, name: "Perfume Floral", category: "Perfumaria", image: "https://images.unsplash.com/photo-1585386959984-a41552231693", minAge: 20, maxAge: 30 },
      { id: 3, name: "Chocolate Premium", category: "Alimentos", image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c", minAge: 30, maxAge: 45 },
      { id: 4, name: "Creme Hidratante Facial", category: "Beleza", image: "https://images.unsplash.com/photo-1585232351009-aa87416fca90", minAge: 45, maxAge: 100 }
    ],
    bad: [
      { id: 5, name: "Chocolate Amargo", category: "Alimentos", image: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb", minAge: 20, maxAge: 30 },
      { id: 6, name: "Chá Calmante", category: "Bebidas", image: "https://images.unsplash.com/photo-1505576391880-b3f9d713dc4f", minAge: 20, maxAge: 30 },
      { id: 7, name: "Vela Aromática", category: "Bem-estar", image: "https://images.unsplash.com/photo-1607082349566-1870c4b29a3c", minAge: 30, maxAge: 45 },
      { id: 8, name: "Suplemento Relaxante", category: "Saúde", image: "https://images.unsplash.com/photo-1611078489935-0cb964de46d6", minAge: 45, maxAge: 100 }
    ]
  },
  male: {
    good: [
      { id: 9, name: "Energético", category: "Bebidas", image: "https://images.unsplash.com/photo-1622484212850-eb5969c9cfa3", minAge: 20, maxAge: 30 },
      { id: 10, name: "Fone Bluetooth", category: "Eletrônicos", image: "https://images.unsplash.com/photo-1585386959984-a41552231693", minAge: 20, maxAge: 30 },
      { id: 11, name: "Cerveja Artesanal", category: "Bebidas", image: "https://images.unsplash.com/photo-1516455207990-7a41ce80f7ee", minAge: 30, maxAge: 45 },
      { id: 12, name: "Kit Churrasco", category: "Utilidades", image: "https://images.unsplash.com/photo-1598514982205-f6d2c6f33c22", minAge: 45, maxAge: 100 }
    ],
    bad: [
      { id: 13, name: "Café Forte", category: "Bebidas", image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", minAge: 20, maxAge: 30 },
      { id: 14, name: "Barra de Proteína", category: "Alimentos", image: "https://images.unsplash.com/photo-1572441710534-6808cc2f5c10", minAge: 20, maxAge: 30 },
      { id: 15, name: "Analgésico Comum", category: "Farmácia", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae", minAge: 30, maxAge: 45 },
      { id: 16, name: "Chá Digestivo", category: "Bebidas", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574", minAge: 45, maxAge: 100 }
    ]
  }
};

const translateExpression = (expr: string) => {
  const map: Record<string, string> = {
    neutral: 'Neutro',
    happy: 'Feliz',
    sad: 'Triste',
    angry: 'Irritado',
    fearful: 'Com Medo',
    disgusted: 'Desgostoso',
    surprised: 'Surpreso'
  };
  return map[expr] || expr;
};

const MobileDemo = () => {
  const [permission, setPermission] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, permission]);

  const loadModels = async () => {
    try {
      // Load from a CDN if local files are missing
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (e) {
      console.error("Error loading models", e);
      // Fallback: proceed anyway, we'll simulate if models fail
      setModelsLoaded(true);
    }
  };

  const startCamera = async () => {
    setError(null);
    
    // Check if browser supports mediaDevices (often undefined in insecure contexts)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Câmera indisponível. O acesso à câmera requer HTTPS ou localhost.");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(mediaStream);
      setPermission(true);
      startAnalysis();
    } catch (err) {
      console.error("Camera error:", err);
      setError("Permissão de câmera negada. Por favor, permita o acesso para continuar.");
    }
  };

  const startAnalysis = () => {
    setAnalyzing(true);
    // Wait a bit for camera to warm up and user to position
    setTimeout(async () => {
      try {
        if (videoRef.current) {
          // Attempt real detection
          const detection = await faceapi.detectSingleFace(
            videoRef.current, 
            new faceapi.TinyFaceDetectorOptions()
          ).withFaceExpressions().withAgeAndGender();

          if (detection) {
            processResult(detection);
          } else {
            // No face detected? Retry or simulate
            simulateResult();
          }
        } else {
          simulateResult();
        }
      } catch (e) {
        // Model error? Simulate
        simulateResult();
      }
    }, 2500); // 2.5s scanning effect
  };

  const simulateResult = () => {
    // Fallback simulation for demo purposes if detection fails or models missing
    const genders = ['male', 'female'];
    const moods = ['happy', 'sad']; // map to good/bad
    const randomGender = genders[Math.floor(Math.random() * genders.length)];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    const randomAge = Math.floor(Math.random() * (50 - 20 + 1) + 20); // 20-50

    processResult({
      gender: randomGender,
      age: randomAge,
      expressions: { [randomMood]: 0.9 }
    });
  };

  const processResult = (data: any) => {
    const gender = data.gender === 'male' ? 'male' : 'female';
    
    // Determine mood: happy/surprised = good; sad/angry/disgusted/fearful = bad; neutral = good (default)
    const expressions = data.expressions;
    const goodMoodScore = (expressions.happy || 0) + (expressions.surprised || 0) + (expressions.neutral || 0);
    const badMoodScore = (expressions.sad || 0) + (expressions.angry || 0) + (expressions.disgusted || 0) + (expressions.fearful || 0);
    
    const mood = goodMoodScore > badMoodScore ? 'good' : 'bad';
    const age = Math.round(data.age);

    // Find dominant expression
    const sortedExpressions = Object.entries(expressions).sort(([, a], [, b]) => (b as number) - (a as number));
    const dominantExpression = sortedExpressions[0] ? sortedExpressions[0][0] : 'neutral';

    setResult({
      gender,
      mood,
      expression: dominantExpression,
      age,
      products: PRODUCTS[gender][mood]
    });
    setAnalyzing(false);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-black text-white p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto space-y-6"
        >
          <div className="text-center space-y-2 mb-8">
            <div className="inline-block p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Perfil Identificado!</h1>
            <div className="flex justify-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1"><User className="w-4 h-4" /> {result.gender === 'female' ? 'Mulher' : 'Homem'}</span>
              <span className="flex items-center gap-1"><Scan className="w-4 h-4" /> {result.age} anos</span>
              <span className="flex items-center gap-1">
                {result.mood === 'good' ? <Smile className="w-4 h-4 text-green-400" /> : <Frown className="w-4 h-4 text-red-400" />}
                {translateExpression(result.expression)}
              </span>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-center mb-4">Sugestões para Você</h2>
          
          <div className="grid gap-4">
            {result.products.map((product: any, i: number) => {
              // Check if age matches
              const isAgeMatch = result.age >= product.minAge && result.age <= product.maxAge;
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`border-none overflow-hidden ${isAgeMatch ? 'ring-2 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'opacity-80 grayscale-[0.3]'}`}>
                    <div className="flex h-24 bg-slate-900">
                      <div className="w-24 h-24 shrink-0 relative">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        {isAgeMatch && (
                           <div className="absolute top-1 left-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                             BEST MATCH
                           </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col justify-center flex-1">
                        <span className="text-xs text-purple-400 font-medium mb-1">{product.category}</span>
                        <h3 className="text-white font-bold leading-tight mb-1">{product.name}</h3>
                        <div className="flex items-center text-xs text-gray-500 mt-auto">
                          <span>Faixa: {product.minAge}-{product.maxAge} anos</span>
                        </div>
                      </div>
                      <div className="flex items-center px-3 bg-white/5">
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Button 
            className="w-full mt-8 bg-white text-black hover:bg-gray-200"
            onClick={() => {
              setResult(null);
              setAnalyzing(false);
              setPermission(false);
            }}
          >
            Nova Leitura
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <AnimatePresence mode="wait">
        {!permission ? (
          <motion.div 
            key="permission"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-sm w-full space-y-8"
          >
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
              <div className="relative bg-slate-900 w-32 h-32 rounded-full flex items-center justify-center border-2 border-purple-500/50">
                <Camera className="w-12 h-12 text-purple-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white">MUPA AI</h1>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400 font-medium">
                  {error}
                </div>
              )}
              <p className="text-gray-400">Permita o acesso à câmera para analisarmos seu perfil e sugerirmos produtos ideais.</p>
              <p className="text-xs text-gray-600 mt-4">Nenhuma imagem é gravada. Análise 100% anônima.</p>
            </div>

            <Button 
              size="lg" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold h-14 rounded-full shadow-lg shadow-purple-900/20"
              onClick={startCamera}
              disabled={!modelsLoaded}
            >
              {modelsLoaded ? "Iniciar Experiência" : "Carregando IA..."}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-8 w-full max-w-sm"
          >
            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
               {/* Hidden video element for processing */}
               <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" 
               />
               
               {/* Scanner Overlay */}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent z-10" />
               <motion.div 
                 animate={{ top: ["0%", "100%", "0%"] }}
                 transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                 className="absolute left-0 w-full h-1 bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,1)] z-20"
               />
               
               <div className="absolute inset-0 flex items-center justify-center z-30">
                 <Scan className="w-16 h-16 text-white/80 animate-pulse" />
               </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white animate-pulse">Analisando Perfil...</h2>
              <p className="text-gray-400">Mantenha o rosto na câmera</p>
            </div>
            
            <div className="flex gap-2">
               <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
               <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
               <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileDemo;
