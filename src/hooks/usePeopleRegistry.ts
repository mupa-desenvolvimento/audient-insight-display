import { useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

export interface RegisteredPerson {
  id: string;
  name: string;
  cpf: string;
  faceDescriptor: Float32Array;
  registeredAt: Date;
  lastSeen?: Date;
  photoUrl?: string;
}

interface DetectedPerson {
  id: string;
  name: string;
  cpf: string;
  confidence: number;
  isNewPerson: boolean;
}

const STORAGE_KEY = 'people_registry';
const FACE_SIMILARITY_THRESHOLD = 0.6; // Limiar para considerar faces iguais

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
          faceDescriptor: new Float32Array(person.faceDescriptor),
          registeredAt: new Date(person.registeredAt),
          lastSeen: person.lastSeen ? new Date(person.lastSeen) : undefined
        }));
        setRegisteredPeople(parsed);
      } catch (error) {
        console.error('Erro ao carregar dados do registro:', error);
      }
    }
  }, []);

  // Salvar dados no localStorage
  const saveToStorage = useCallback((people: RegisteredPerson[]) => {
    try {
      const serializable = people.map(person => ({
        ...person,
        faceDescriptor: Array.from(person.faceDescriptor),
        registeredAt: person.registeredAt.toISOString(),
        lastSeen: person.lastSeen?.toISOString()
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
    }
  }, []);

  // Registrar nova pessoa
  const registerPerson = useCallback(async (
    name: string,
    cpf: string,
    videoElement: HTMLVideoElement
  ): Promise<{ success: boolean; message: string; personId?: string }> => {
    if (!name.trim() || !cpf.trim()) {
      return { success: false, message: 'Nome e CPF são obrigatórios' };
    }

    // Verificar se CPF já existe
    if (registeredPeople.some(person => person.cpf === cpf)) {
      return { success: false, message: 'CPF já cadastrado' };
    }

    setIsLoading(true);
    try {
      // Detectar face no vídeo
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return { success: false, message: 'Nenhuma face detectada. Posicione-se melhor na câmera.' };
      }

      // Verificar se a face já está registrada
      for (const person of registeredPeople) {
        const distance = faceapi.euclideanDistance(detection.descriptor, person.faceDescriptor);
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
        faceDescriptor: detection.descriptor,
        registeredAt: new Date()
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

  // Identificar pessoa por face
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
        const distance = faceapi.euclideanDistance(detection.descriptor, person.faceDescriptor);
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
          confidence: 1 - bestMatch.distance, // Converter distância para confiança
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
  }, []);

  return {
    registeredPeople,
    isLoading,
    registerPerson,
    identifyPerson,
    removePerson,
    clearRegistry,
    totalRegistered: registeredPeople.length
  };
};