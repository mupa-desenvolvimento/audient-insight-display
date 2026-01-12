import { useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import type { FaceCaptureData } from '@/components/FaceCapture';

export interface RegisteredPerson {
  id: string;
  name: string;
  cpf: string;
  faceDescriptors: Float32Array[]; // Múltiplos descritores para maior precisão
  averageDescriptor: Float32Array; // Descritor médio para comparação rápida
  registeredAt: Date;
  lastSeen?: Date;
  photoUrl?: string; // Melhor foto do cadastro
  age?: number;
  gender?: string;
}

interface DetectedPerson {
  id: string;
  name: string;
  cpf: string;
  confidence: number;
  isNewPerson: boolean;
}

const STORAGE_KEY = 'people_registry_v2';
const FACE_SIMILARITY_THRESHOLD = 0.5; // Limiar mais rigoroso com múltiplas capturas

// Calcula o descritor médio de múltiplos descritores
const calculateAverageDescriptor = (descriptors: Float32Array[]): Float32Array => {
  if (descriptors.length === 0) throw new Error('Nenhum descritor fornecido');
  if (descriptors.length === 1) return descriptors[0];

  const length = descriptors[0].length;
  const average = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const desc of descriptors) {
      sum += desc[i];
    }
    average[i] = sum / descriptors.length;
  }

  return average;
};

// Calcula a distância mínima entre um descritor e múltiplos descritores
const getMinDistance = (testDescriptor: Float32Array, descriptors: Float32Array[]): number => {
  let minDistance = Infinity;
  for (const desc of descriptors) {
    const distance = faceapi.euclideanDistance(testDescriptor, desc);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  return minDistance;
};

export const usePeopleRegistry = () => {
  const [registeredPeople, setRegisteredPeople] = useState<RegisteredPerson[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar dados do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const parsed = data.map((person: any) => ({
          ...person,
          faceDescriptors: person.faceDescriptors.map((d: number[]) => new Float32Array(d)),
          averageDescriptor: new Float32Array(person.averageDescriptor),
          registeredAt: new Date(person.registeredAt),
          lastSeen: person.lastSeen ? new Date(person.lastSeen) : undefined
        }));
        setRegisteredPeople(parsed);
      } catch (error) {
        console.error('Erro ao carregar dados do registro:', error);
        // Tentar migrar dados antigos
        migrateOldData();
      }
    }
  }, []);

  // Migrar dados do formato antigo
  const migrateOldData = () => {
    const oldData = localStorage.getItem('people_registry');
    if (oldData) {
      try {
        const data = JSON.parse(oldData);
        const migrated = data.map((person: any) => ({
          id: person.id,
          name: person.name,
          cpf: person.cpf,
          faceDescriptors: [new Float32Array(person.faceDescriptor)],
          averageDescriptor: new Float32Array(person.faceDescriptor),
          registeredAt: new Date(person.registeredAt),
          lastSeen: person.lastSeen ? new Date(person.lastSeen) : undefined,
          photoUrl: person.photoUrl
        }));
        setRegisteredPeople(migrated);
        saveToStorage(migrated);
        console.log('Dados migrados com sucesso!');
      } catch (error) {
        console.error('Erro ao migrar dados:', error);
      }
    }
  };

  // Salvar dados no localStorage
  const saveToStorage = useCallback((people: RegisteredPerson[]) => {
    try {
      const serializable = people.map(person => ({
        ...person,
        faceDescriptors: person.faceDescriptors.map(d => Array.from(d)),
        averageDescriptor: Array.from(person.averageDescriptor),
        registeredAt: person.registeredAt.toISOString(),
        lastSeen: person.lastSeen?.toISOString()
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }, []);

  // Registrar nova pessoa com múltiplas capturas
  const registerPersonWithCaptures = useCallback(async (
    name: string,
    cpf: string,
    captures: FaceCaptureData[]
  ): Promise<{ success: boolean; message: string; personId?: string }> => {
    if (!name.trim() || !cpf.trim()) {
      return { success: false, message: 'Nome e CPF são obrigatórios' };
    }

    if (captures.length === 0) {
      return { success: false, message: 'Nenhuma captura de face fornecida' };
    }

    // Verificar se CPF já existe
    if (registeredPeople.some(person => person.cpf === cpf)) {
      return { success: false, message: 'CPF já cadastrado' };
    }

    setIsLoading(true);
    try {
      const descriptors = captures.map(c => c.descriptor);
      const averageDescriptor = calculateAverageDescriptor(descriptors);

      // Verificar se a face já está registrada
      for (const person of registeredPeople) {
        const distance = faceapi.euclideanDistance(averageDescriptor, person.averageDescriptor);
        if (distance < FACE_SIMILARITY_THRESHOLD) {
          return { 
            success: false, 
            message: `Face já cadastrada para ${person.name}` 
          };
        }
      }

      // Selecionar a melhor foto (maior qualidade)
      const bestCapture = captures.reduce((best, current) => 
        current.quality > best.quality ? current : best
      , captures[0]);

      // Calcular idade e gênero médios
      const avgAge = Math.round(captures.reduce((sum, c) => sum + c.age, 0) / captures.length);
      const genderCounts = captures.reduce((acc, c) => {
        acc[c.gender] = (acc[c.gender] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const dominantGender = Object.entries(genderCounts).reduce((a, b) => 
        a[1] > b[1] ? a : b
      )[0];

      const newPerson: RegisteredPerson = {
        id: `person_${Date.now()}`,
        name: name.trim(),
        cpf: cpf.trim(),
        faceDescriptors: descriptors,
        averageDescriptor,
        registeredAt: new Date(),
        photoUrl: bestCapture.photoDataUrl,
        age: avgAge,
        gender: dominantGender
      };

      const updatedPeople = [...registeredPeople, newPerson];
      setRegisteredPeople(updatedPeople);
      saveToStorage(updatedPeople);

      return { 
        success: true, 
        message: `${name} cadastrado com ${captures.length} capturas!`,
        personId: newPerson.id
      };
    } catch (error) {
      console.error('Erro ao registrar pessoa:', error);
      return { success: false, message: 'Erro ao processar faces' };
    } finally {
      setIsLoading(false);
    }
  }, [registeredPeople, saveToStorage]);

  // Método legado para compatibilidade
  const registerPerson = useCallback(async (
    name: string,
    cpf: string,
    videoElement: HTMLVideoElement
  ): Promise<{ success: boolean; message: string; personId?: string }> => {
    if (!name.trim() || !cpf.trim()) {
      return { success: false, message: 'Nome e CPF são obrigatórios' };
    }

    if (registeredPeople.some(person => person.cpf === cpf)) {
      return { success: false, message: 'CPF já cadastrado' };
    }

    setIsLoading(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withAgeAndGender();

      if (!detection) {
        return { success: false, message: 'Nenhuma face detectada. Posicione-se melhor na câmera.' };
      }

      // Verificar se a face já está registrada
      for (const person of registeredPeople) {
        const distance = faceapi.euclideanDistance(detection.descriptor, person.averageDescriptor);
        if (distance < FACE_SIMILARITY_THRESHOLD) {
          return { 
            success: false, 
            message: `Face já cadastrada para ${person.name}` 
          };
        }
      }

      const newPerson: RegisteredPerson = {
        id: `person_${Date.now()}`,
        name: name.trim(),
        cpf: cpf.trim(),
        faceDescriptors: [detection.descriptor],
        averageDescriptor: detection.descriptor,
        registeredAt: new Date(),
        age: Math.round(detection.age),
        gender: detection.gender === 'female' ? 'feminino' : 'masculino'
      };

      const updatedPeople = [...registeredPeople, newPerson];
      setRegisteredPeople(updatedPeople);
      saveToStorage(updatedPeople);

      return { 
        success: true, 
        message: 'Pessoa cadastrada com sucesso!',
        personId: newPerson.id
      };
    } catch (error) {
      console.error('Erro ao registrar pessoa:', error);
      return { success: false, message: 'Erro ao processar face' };
    } finally {
      setIsLoading(false);
    }
  }, [registeredPeople, saveToStorage]);

  // Identificar pessoa por face - agora usa múltiplos descritores
  const identifyPerson = useCallback(async (
    videoElement: HTMLVideoElement
  ): Promise<DetectedPerson | null> => {
    if (registeredPeople.length === 0) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) return null;

      let bestMatch: { person: RegisteredPerson; distance: number } | null = null;

      for (const person of registeredPeople) {
        // Usar distância mínima para todos os descritores registrados
        const distance = getMinDistance(detection.descriptor, person.faceDescriptors);
        if (distance < FACE_SIMILARITY_THRESHOLD) {
          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = { person, distance };
          }
        }
      }

      if (bestMatch) {
        // Atualizar último visto
        const updatedPeople = registeredPeople.map(p => 
          p.id === bestMatch!.person.id 
            ? { ...p, lastSeen: new Date() }
            : p
        );
        setRegisteredPeople(updatedPeople);
        saveToStorage(updatedPeople);

        return {
          id: bestMatch.person.id,
          name: bestMatch.person.name,
          cpf: bestMatch.person.cpf,
          confidence: 1 - bestMatch.distance,
          isNewPerson: false
        };
      }

      return {
        id: `unknown_${Date.now()}`,
        name: 'Pessoa não identificada',
        cpf: '',
        confidence: 0,
        isNewPerson: true
      };
    } catch (error) {
      console.error('Erro ao identificar pessoa:', error);
      return null;
    }
  }, [registeredPeople, saveToStorage]);

  // Adicionar mais capturas a uma pessoa existente
  const addCapturesToPerson = useCallback(async (
    personId: string,
    newCaptures: FaceCaptureData[]
  ): Promise<{ success: boolean; message: string }> => {
    const person = registeredPeople.find(p => p.id === personId);
    if (!person) {
      return { success: false, message: 'Pessoa não encontrada' };
    }

    const newDescriptors = [...person.faceDescriptors, ...newCaptures.map(c => c.descriptor)];
    const newAverage = calculateAverageDescriptor(newDescriptors);

    // Selecionar melhor foto
    let bestPhotoUrl = person.photoUrl;
    const currentBestQuality = person.photoUrl ? 70 : 0; // Assumir qualidade média se já tem foto
    const bestNewCapture = newCaptures.reduce((best, current) => 
      current.quality > best.quality ? current : best
    , newCaptures[0]);

    if (bestNewCapture.quality > currentBestQuality) {
      bestPhotoUrl = bestNewCapture.photoDataUrl;
    }

    const updatedPerson: RegisteredPerson = {
      ...person,
      faceDescriptors: newDescriptors,
      averageDescriptor: newAverage,
      photoUrl: bestPhotoUrl
    };

    const updatedPeople = registeredPeople.map(p => 
      p.id === personId ? updatedPerson : p
    );
    setRegisteredPeople(updatedPeople);
    saveToStorage(updatedPeople);

    return { 
      success: true, 
      message: `Adicionadas ${newCaptures.length} novas capturas. Total: ${newDescriptors.length}` 
    };
  }, [registeredPeople, saveToStorage]);

  // Remover pessoa
  const removePerson = useCallback((personId: string) => {
    const updatedPeople = registeredPeople.filter(p => p.id !== personId);
    setRegisteredPeople(updatedPeople);
    saveToStorage(updatedPeople);
  }, [registeredPeople, saveToStorage]);

  // Limpar todos os registros
  const clearRegistry = useCallback(() => {
    setRegisteredPeople([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('people_registry'); // Limpar dados antigos também
  }, []);

  return {
    registeredPeople,
    isLoading,
    registerPerson,
    registerPersonWithCaptures,
    addCapturesToPerson,
    identifyPerson,
    removePerson,
    clearRegistry,
    totalRegistered: registeredPeople.length
  };
};