import { useState, useEffect, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";
import { Loader2, Camera, Scan, Sparkles, Smile, Frown, User, ShoppingBag, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const translateExpression = (expr: string) => {
  const map: Record<string, string> = {
    neutral: 'Neutro', happy: 'Feliz', sad: 'Triste',
    angry: 'Irritado', fearful: 'Com Medo', disgusted: 'Desgostoso', surprised: 'Surpreso'
  };
  return map[expr] || expr;
};

const mapMoodToTargetMood = (mood: 'good' | 'bad', expression: string): string[] => {
  if (mood === 'good') return ['happy', 'all'];
  return ['neutral', 'sad', 'all'];
};

const getProductImageUrl = (ean: string, imageUrl: string | null): string => {
  if (imageUrl) return imageUrl;
  // Use Mupa API image endpoint based on EAN
  return `https://api.mfrural.com.br/api/v1/produto-imagem/${ean}`;
};

const deduplicateByName = (products: any[]): any[] => {
  const seen = new Set<string>();
  return products.filter(p => {
    const key = p.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const scoreProduct = (p: any, gender: string, age: number, targetMoods: string[]): number => {
  let score = p.score ?? 50;
  
  // Bonus for gender-specific match (not "all")
  if (p.target_gender === gender) score += 30;
  // Penalty for generic "all" gender
  if (p.target_gender === 'all') score -= 10;
  
  // Bonus for mood-specific match (not "all")
  if (p.target_mood !== 'all' && targetMoods.includes(p.target_mood)) score += 20;
  
  // Bonus for tighter age range (more specific = better)
  const ageRange = (p.target_age_max ?? 100) - (p.target_age_min ?? 0);
  if (ageRange < 20) score += 25;
  else if (ageRange < 40) score += 15;
  else if (ageRange < 60) score += 5;
  // Penalty for very broad ranges
  if (ageRange >= 80) score -= 15;
  
  // Bonus for age being near the center of the range
  const center = ((p.target_age_min ?? 0) + (p.target_age_max ?? 100)) / 2;
  const distFromCenter = Math.abs(age - center);
  if (distFromCenter < 5) score += 10;
  else if (distFromCenter < 15) score += 5;
  
  return score;
};

const diversifyByCategory = (products: any[], count: number): any[] => {
  const result: any[] = [];
  const usedCategories = new Set<string>();
  
  // First pass: pick one from each category
  for (const p of products) {
    if (result.length >= count) break;
    const cat = (p.category || 'Geral').toLowerCase();
    if (!usedCategories.has(cat)) {
      usedCategories.add(cat);
      result.push(p);
    }
  }
  
  // Second pass: fill remaining with best scored
  for (const p of products) {
    if (result.length >= count) break;
    if (!result.find(r => r.id === p.id)) {
      result.push(p);
    }
  }
  
  return result;
};

const fetchRecommendedProducts = async (gender: 'male' | 'female', mood: 'good' | 'bad', expression: string, age: number) => {
  const targetMoods = mapMoodToTargetMood(mood, expression);
  const genderFilters = [gender, 'all'];

  const mapAndRank = (data: any[]) => {
    const scored = data.map(p => ({
      id: p.id,
      name: p.name,
      ean: p.ean,
      category: p.category || 'Geral',
      image: getProductImageUrl(p.ean, p.image_url),
      minAge: p.target_age_min ?? 0,
      maxAge: p.target_age_max ?? 100,
      inRange: age >= (p.target_age_min ?? 0) && age <= (p.target_age_max ?? 100),
      score: scoreProduct(p, gender, age, targetMoods),
      targetGender: p.target_gender,
    }));
    
    // Deduplicate, sort by computed score, then diversify categories
    const deduped = deduplicateByName(scored).sort((a, b) => b.score - a.score);
    return diversifyByCategory(deduped, 4);
  };

  // Fetch a broad set – age-filtered only
  const { data, error } = await supabase
    .from('product_recommendations')
    .select('*')
    .eq('is_active', true)
    .in('target_gender', genderFilters)
    .lte('target_age_min', age)
    .gte('target_age_max', age)
    .order('score', { ascending: false })
    .limit(100);

  if (!error && data && data.length > 0) {
    console.log(`[MobileDemo] Found ${data.length} candidates for gender=${gender}, age=${age}, moods=${targetMoods.join(',')}`);
    return mapAndRank(data);
  }

  // Fallback: broader query without mood/gender filter
  console.warn('[MobileDemo] No results, broadening search');
  const { data: fallback } = await supabase
    .from('product_recommendations')
    .select('*')
    .eq('is_active', true)
    .lte('target_age_min', age)
    .gte('target_age_max', age)
    .order('score', { ascending: false })
    .limit(100);
  
  return mapAndRank(fallback || []);
};

const MobileDemo = () => {
  const [phase, setPhase] = useState<'welcome' | 'scanning' | 'results'>('welcome');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<number | null>(null);
  const detectionsRef = useRef<any[]>([]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        console.log("[MobileDemo] Models loaded successfully (SSD MobileNet)");
      } catch (e) {
        console.error("[MobileDemo] Error loading models:", e);
      }
      setModelsLoaded(true);
    };
    loadModels();

    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    setError(null);
    setPhase('scanning');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Câmera indisponível. Acesso requer HTTPS.");
      setPhase('welcome');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = mediaStream;

      // Wait for the video element to be in the DOM after phase change
      const waitForVideo = () => new Promise<void>((resolve) => {
        const check = () => {
          if (videoRef.current) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });

      await waitForVideo();

      videoRef.current!.srcObject = mediaStream;
      videoRef.current!.onloadedmetadata = () => {
        videoRef.current?.play();
        detectionsRef.current = [];
        setDetectionProgress(0);
        startContinuousDetection();
      };
    } catch (err: any) {
      console.error("[MobileDemo] Camera error:", err);
      setPhase('welcome');
      if (err.name === 'NotAllowedError') {
        setError("Permissão de câmera negada. Permita o acesso nas configurações do navegador.");
      } else if (err.name === 'NotFoundError') {
        setError("Nenhuma câmera encontrada neste dispositivo.");
      } else {
        setError(`Erro ao acessar câmera: ${err.message}`);
      }
    }
  };

  const startContinuousDetection = () => {
    const REQUIRED_DETECTIONS = 12;
    let attempts = 0;
    const MAX_ATTEMPTS = 40;

    detectIntervalRef.current = window.setInterval(async () => {
      attempts++;

      if (!videoRef.current || videoRef.current.readyState < 2) {
        console.log("[MobileDemo] Video not ready yet, attempt:", attempts);
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
          .withFaceExpressions()
          .withAgeAndGender();

        if (detection) {
          detectionsRef.current.push(detection);
          const progress = Math.min(100, Math.round((detectionsRef.current.length / REQUIRED_DETECTIONS) * 100));
          setDetectionProgress(progress);
          console.log(`[MobileDemo] Detection ${detectionsRef.current.length}/${REQUIRED_DETECTIONS}`, {
            gender: detection.gender,
            age: Math.round(detection.age),
            genderProbability: detection.genderProbability
          });

          if (detectionsRef.current.length >= REQUIRED_DETECTIONS) {
            clearInterval(detectIntervalRef.current!);
            detectIntervalRef.current = null;
            finalizeResult();
          }
        } else {
          console.log("[MobileDemo] No face detected, attempt:", attempts);
        }
      } catch (e) {
        console.error("[MobileDemo] Detection error:", e);
      }

      if (attempts >= MAX_ATTEMPTS && detectionsRef.current.length === 0) {
        clearInterval(detectIntervalRef.current!);
        detectIntervalRef.current = null;
        setError("Não foi possível detectar um rosto. Posicione-se em frente à câmera com boa iluminação.");
        setPhase('welcome');
        stopCamera();
      }
    }, 600);
  };

  const finalizeResult = async () => {
    const detections = detectionsRef.current;
    
    const avgAge = Math.round(detections.reduce((s, d) => s + d.age, 0) / detections.length);
    
    const maleCount = detections.filter(d => d.gender === 'male').length;
    const gender: 'male' | 'female' = maleCount > detections.length / 2 ? 'male' : 'female';

    const exprTotals: Record<string, number> = {};
    detections.forEach(d => {
      Object.entries(d.expressions).forEach(([key, val]) => {
        exprTotals[key] = (exprTotals[key] || 0) + (val as number);
      });
    });
    Object.keys(exprTotals).forEach(k => exprTotals[k] /= detections.length);

    const goodScore = (exprTotals.happy || 0) + (exprTotals.surprised || 0) + (exprTotals.neutral || 0);
    const badScore = (exprTotals.sad || 0) + (exprTotals.angry || 0) + (exprTotals.disgusted || 0) + (exprTotals.fearful || 0);
    const mood: 'good' | 'bad' = goodScore >= badScore ? 'good' : 'bad';

    const sorted = Object.entries(exprTotals).sort(([, a], [, b]) => b - a);
    const dominantExpression = sorted[0]?.[0] || 'neutral';

    stopCamera();

    const products = await fetchRecommendedProducts(gender, mood, dominantExpression, avgAge);

    setResult({ gender, mood, expression: dominantExpression, age: avgAge, products });
    setPhase('results');
  };

  const reset = () => {
    stopCamera();
    setResult(null);
    setError(null);
    setDetectionProgress(0);
    detectionsRef.current = [];
    setPhase('welcome');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatePresence mode="wait">
        {phase === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-sm w-full space-y-8">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                <div className="relative bg-slate-900 w-32 h-32 rounded-full flex items-center justify-center border-2 border-purple-500/50">
                  <Camera className="w-12 h-12 text-purple-400" />
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold">MUPA AI</h1>
                <p className="text-gray-400">Permita o acesso à câmera para analisarmos seu perfil e sugerirmos produtos ideais.</p>
                <p className="text-xs text-gray-600">Nenhuma imagem é gravada. Análise 100% anônima.</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold h-14 rounded-full"
                onClick={startCamera}
                disabled={!modelsLoaded}
              >
                {modelsLoaded ? "Iniciar Experiência" : (
                  <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Carregando IA...</span>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {phase === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
          >
            <div className="max-w-sm w-full flex flex-col items-center gap-6">
              {/* Live camera feed */}
              <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.3)]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Scan line */}
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 w-full h-0.5 bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,1)] z-10"
                />
                {/* Corner markers */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-purple-400 rounded-tl-sm z-10" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-purple-400 rounded-tr-sm z-10" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-purple-400 rounded-bl-sm z-10" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-purple-400 rounded-br-sm z-10" />
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Analisando perfil...</span>
                  <span>{detectionProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    animate={{ width: `${detectionProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-center text-xs text-gray-500 mt-2">Posicione seu rosto na câmera com boa iluminação</p>
              </div>

              <Button variant="ghost" className="text-gray-500 mt-4" onClick={reset}>
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}

        {phase === 'results' && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-4 pb-8"
          >
            <div className="max-w-md mx-auto space-y-6">
              {/* Profile header */}
              <div className="text-center space-y-3 pt-6">
                <div className="inline-block p-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold">Perfil Identificado!</h1>
                <div className="flex justify-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {result.gender === 'female' ? 'Mulher' : 'Homem'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Scan className="w-4 h-4" />
                    {result.age} anos
                  </span>
                  <span className="flex items-center gap-1">
                    {result.mood === 'good'
                      ? <Smile className="w-4 h-4 text-green-400" />
                      : <Frown className="w-4 h-4 text-red-400" />}
                    {translateExpression(result.expression)}
                  </span>
                </div>
              </div>

              {/* Products */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-400" />
                  Recomendados para Você
                </h2>

                {result.products.map((product: any, i: number) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                  >
                    <Card className={`border-none overflow-hidden ${product.inRange
                      ? 'ring-2 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                      : 'opacity-75'}`}
                    >
                      <div className="flex h-24 bg-slate-900">
                        <div className="w-24 h-24 shrink-0 relative">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {product.inRange && (
                            <div className="absolute top-1 left-1 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                              MATCH
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
                          <span className="text-xs text-purple-400 font-medium">{product.category}</span>
                          <h3 className="text-white font-bold leading-tight truncate">{product.name}</h3>
                          <span className="text-xs text-gray-500 mt-1">Faixa: {product.minAge}–{product.maxAge} anos</span>
                        </div>
                        <div className="flex items-center px-3 bg-white/5">
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Button
                className="w-full bg-white text-black hover:bg-gray-200 font-semibold h-12 rounded-full"
                onClick={reset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Nova Leitura
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileDemo;
