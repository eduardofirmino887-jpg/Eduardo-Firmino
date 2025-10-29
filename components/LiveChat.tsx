




import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob as GenAIBlob, FunctionDeclaration, Type } from '@google/genai';
import { Button } from './ui/Button';
import { MicrophoneIcon, XIcon, PlayIcon, PaperclipIcon, QuestionMarkCircleIcon, SparklesIcon } from './Icons';
import { OperationType, Transaction, PalletOperationType, PalletProfile, PalletTransaction, User } from '../types';

interface LiveChatProps {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  addTransaction: (transaction: Omit<Transaction, 'balance' | 'unitKg' | 'id'>) => void;
  addPalletTransaction: (transaction: Omit<PalletTransaction, 'id'| 'month' | 'duration'>) => void;
  deleteTransaction: (id: string) => void;
  deletePalletTransaction: (id: string) => void;
  clearAllStretchFilmTransactions: () => void;
  clearAllPalletTransactions: () => void;
  users: User[]; // Added for user management
  onAddUser: (user: Omit<User, 'id'>) => void; // Added for user management
  onDeleteUser: (id: string) => void; // Added for user management
  transactions: Transaction[];
  palletTransactions: PalletTransaction[];
}

type LiveChatTab = 'chat' | 'attachFile' | 'analysis';

// === Audio Utility Functions (from guidelines) ===
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper to combine Float32Array chunks efficiently
const combineFloat32Arrays = (arrays: Float32Array[]): Float32Array => {
    if (arrays.length === 0) return new Float32Array(0);
    const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
};

// Helper to combine Uint8Array chunks efficiently
const combineUint8Arrays = (arrays: Uint8Array[]): Uint8Array => {
    if (arrays.length === 0) return new Uint8Array(0);
    const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
};

// =================================================

// --- Function Declarations for Gemini ---
const createStretchFilmMovementDeclaration: FunctionDeclaration = {
  name: 'createStretchFilmMovement',
  description: 'Cria uma nova movimentação de filme stretch no sistema de logística. Use para entradas, saídas, ajustes ou devoluções de material. Veronica pode preencher automaticamente campos se não forem fornecidos, perguntando ao usuário para confirmação se houver ambiguidade.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      operation: {
        type: Type.STRING,
        enum: Object.values(OperationType),
        description: 'Tipo de operação (ENTRADA, SAÍDA, AJUSTE, DEVOLUÇÃO).',
      },
      quantity: {
        type: Type.NUMBER,
        description: 'A quantidade de material em kg para a movimentação.',
      },
      invoice: {
        type: Type.STRING,
        description: 'Número da nota fiscal, se aplicável.',
        nullable: true,
      },
      observations: {
        type: Type.STRING,
        description: 'Quaisquer observações adicionais sobre a movimentação.',
        nullable: true,
      },
    },
    required: ['operation', 'quantity'],
  },
};

const deleteStretchFilmMovementDeclaration: FunctionDeclaration = {
  name: 'deleteStretchFilmMovement',
  description: 'Apaga uma movimentação de filme stretch existente do sistema. É necessário o número da nota fiscal ou uma data e tipo de operação para identificar a movimentação a ser apagada.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      invoice: {
        type: Type.STRING,
        description: 'Número da nota fiscal da movimentação de filme stretch a ser apagada.',
        nullable: true,
      },
      date: {
        type: Type.STRING,
        description: 'Data da movimentação a ser apagada, no formato YYYY-MM-DD. Deve ser usada junto com o tipo de operação se a nota fiscal não for fornecida.',
        nullable: true,
      },
      operation: {
        type: Type.STRING,
        enum: Object.values(OperationType),
        description: 'Tipo de operação (ENTRADA, SAÍDA, AJUSTE, DEVOLUÇÃO) da movimentação a ser apagada. Deve ser usado junto com a data se a nota fiscal não for fornecida.',
        nullable: true,
      },
      // Consider adding 'quantity' for better disambiguation if needed
    },
    required: [], // Requires at least one identifying field
  },
};

const clearAllStretchFilmDataDeclaration: FunctionDeclaration = {
    name: 'clearAllStretchFilmData',
    description: 'Apaga *todas* as movimentações de filme stretch registradas no histórico. Este comando não requer parâmetros e deve ser usado com cautela, pois limpará todos os dados.',
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: [],
    },
};


const createPalletMovementDeclaration: FunctionDeclaration = {
  name: 'createPalletMovement',
  description: 'Cria uma nova movimentação de palete no sistema de logística. Veronica pode preencher automaticamente campos se não forem fornecidos, perguntando ao usuário para confirmação se houver ambiguidade.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      operation: {
        type: Type.STRING,
        enum: Object.values(PalletOperationType),
        description: 'Tipo de operação (ENTRADA, SAÍDA, DEVOLUÇÃO, AJUSTE).',
      },
      date: {
        type: Type.STRING,
        description: 'Data da movimentação no formato YYYY-MM-DD.',
        nullable: true,
      },
      invoice: {
        type: Type.STRING,
        description: 'Número da nota fiscal, se aplicável.',
        nullable: true,
      },
      pbrInput: { type: Type.NUMBER, description: 'Quantidade de paletes PBR de entrada.', nullable: true, },
      oneWay: { type: Type.NUMBER, description: 'Quantidade de paletes One Way.', nullable: true, },
      pbrBroken: { type: Type.NUMBER, description: 'Quantidade de paletes PBR quebrados.', nullable: true, },
      chepInput: { type: Type.NUMBER, description: 'Quantidade de paletes CHEP de entrada.', nullable: true, },
      chepBroken: { type: Type.NUMBER, description: 'Quantidade de paletes CHEP quebrados.', nullable: true, },
      output: { type: Type.NUMBER, description: 'Quantidade de paletes de saída.', nullable: true, },
      returned: { type: Type.NUMBER, description: 'Quantidade de paletes retornados.', nullable: true, },
      origin: { type: Type.STRING, description: 'Origem ou destino da movimentação.', nullable: true, },
      plate: { type: Type.STRING, description: 'Placa do veículo.', nullable: true, },
      driver: { type: Type.STRING, description: 'Nome do motorista.', nullable: true, },
      client: { type: Type.STRING, description: 'Nome do cliente.', nullable: true, },
      profile: {
        type: Type.STRING,
        enum: Object.values(PalletProfile),
        description: 'Perfil da movimentação (ATACADO, VAREJO, CROSS, DEVOLUÇÃO).',
        nullable: true,
      },
      cte: { type: Type.STRING, description: 'Número do CTE.', nullable: true, },
      checker: { type: Type.STRING, description: 'Nome do conferente.', nullable: true, },
      startTime: { type: Type.STRING, description: 'Hora de início da operação (HH:mm).', nullable: true, },
      endTime: { type: Type.STRING, description: 'Hora de fim da operação (HH:mm).', nullable: true, },
      bonus: { type: Type.STRING, description: 'Informação de bônus.', nullable: true, },
      bonusId: { type: Type.STRING, description: 'ID do bônus.', nullable: true, },
      observations: { type: Type.STRING, description: 'Observações adicionais.', nullable: true, },
    },
    required: ['operation'],
  },
};

const deletePalletMovementDeclaration: FunctionDeclaration = {
  name: 'deletePalletMovement',
  description: 'Apaga uma movimentação de palete existente do sistema. É necessário o número da nota fiscal ou uma data e tipo de operação para identificar a movimentação a ser apagada.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      invoice: {
        type: Type.STRING,
        description: 'Número da nota fiscal da movimentação de palete a ser apagada.',
        nullable: true,
      },
      date: {
        type: Type.STRING,
        description: 'Data da movimentação a ser apagada, no formato YYYY-MM-DD. Deve ser usada junto com o tipo de operação se a nota fiscal não for fornecida.',
        nullable: true,
      },
      operation: {
        type: Type.STRING,
        enum: Object.values(PalletOperationType),
        description: 'Tipo de operação (ENTRADA, SAÍDA, DEVOLUÇÃO, AJUSTE) da movimentação de palete a ser apagada. Deve ser usado junto com a data se a nota fiscal não for fornecida.',
        nullable: true,
      },
      // Consider adding 'client' or 'plate' for better disambiguation if needed
    },
    required: [], // Requires at least one identifying field
  },
};

const clearAllPalletDataDeclaration: FunctionDeclaration = {
    name: 'clearAllPalletData',
    description: 'Apaga *todas* as movimentações de paletes registradas no histórico. Este comando não requer parâmetros e deve ser usado com cautela, pois limpará todos os dados.',
    parameters: {
        type: Type.OBJECT,
        properties: {},
        required: [],
    },
};

const generateCreativeTextDeclaration: FunctionDeclaration = {
  name: 'generateCreativeText',
  description: 'Gera conteúdo textual criativo como introduções de filmes, letras de músicas, histórias, piadas, poemas, roteiros ou textos gerais sobre um tópico específico.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'O tópico ou tema para o qual gerar o texto.',
      },
      type: {
        type: Type.STRING,
        enum: ['movie intro', 'lyrics', 'story', 'general', 'piada', 'poema', 'roteiro'],
        description: 'O tipo de conteúdo criativo a ser gerado (introdução de filme, letra de música, história, texto geral, piada, poema ou roteiro).',
      },
      wordLimit: {
        type: Type.NUMBER,
        description: 'Limite de palavras para o texto gerado. Se não especificado, a IA decide o tamanho.',
        nullable: true,
      },
    },
    required: ['prompt', 'type'],
  },
};

const addUserDeclaration: FunctionDeclaration = {
  name: 'addUser',
  description: 'Adiciona um novo usuário ao sistema com nome, perfil e senha. Veronica pode gerar uma foto de perfil padrão se nenhuma for especificada.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'O nome completo do novo usuário.' },
      role: { type: Type.STRING, description: 'O perfil do usuário (ex: Admin, Operador, Visualizador).' },
      password: { type: Type.STRING, description: 'A senha para o novo usuário.' },
    },
    required: ['name', 'role', 'password'],
  },
};

const deleteUserDeclaration: FunctionDeclaration = {
  name: 'deleteUser',
  description: 'Apaga um usuário existente do sistema. É necessário o nome do usuário para identificá-lo.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userName: { type: Type.STRING, description: 'O nome completo do usuário a ser apagado.' },
    },
    required: ['userName'],
  },
};

// ==========================================

// Define the type for history entries
interface HistoryEntry {
  id: string;
  speaker: 'user' | 'Veronica';
  text: string;
  audioBase64?: string; // Optional base64 audio string for playback
}

const LiveChat: React.FC<LiveChatProps> = ({ 
  addToast, 
  addTransaction, 
  addPalletTransaction, 
  deleteTransaction, 
  deletePalletTransaction,
  clearAllStretchFilmTransactions,
  clearAllPalletTransactions,
  users, // Destructure new prop
  onAddUser, // Destructure new prop
  onDeleteUser, // Destructure new prop
  transactions,
  palletTransactions,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentInputTranscription, setCurrentInputTranscription] = useState<string>('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState<string>('');
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const audioStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveSessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  // Refs for accumulating audio chunks for the current turn
  const currentInputAudioChunksRef = useRef<Float32Array[]>([]);
  const currentOutputAudioChunksRef = useRef<Uint8Array[]>([]);
  const currentPlayingSourceRef = useRef<AudioBufferSourceNode | null>(null); // To manage single playback for history

  // State for tabs and file attachment
  const [activeLiveChatTab, setActiveLiveChatTab] = useState<LiveChatTab>('chat');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileBase64, setAttachedFileBase64] = useState<string | null>(null);
  const [attachedFileMimeType, setAttachedFileMimeType] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [fileAnalysisLoading, setFileAnalysisLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for complex analysis tab
  const [analysisInput, setAnalysisInput] = useState<string>('');
  const [analysisHistory, setAnalysisHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);


  // Request microphone permission on mount
  useEffect(() => {
    const requestMicrophone = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        addToast('Permissão do microfone concedida.', 'success');
      } catch (err) {
        console.error('Microphone permission denied:', err);
        addToast('Permissão do microfone negada. Não é possível usar o chat de voz.', 'error');
        setErrorMessage('Permissão do microfone negada.');
      }
    };
    requestMicrophone();
  }, [addToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveSession();
      if (currentPlayingSourceRef.current) {
        currentPlayingSourceRef.current.stop();
        currentPlayingSourceRef.current.disconnect();
      }
    };
  }, []);

  const stopAudioPlayback = useCallback(() => {
    for (const source of playingSourcesRef.current.values()) {
      source.stop();
      source.disconnect(); // Disconnect to release resources
    }
    playingSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    // Stop any history playback
    if (currentPlayingSourceRef.current) {
      currentPlayingSourceRef.current.stop();
      currentPlayingSourceRef.current.disconnect();
      currentPlayingSourceRef.current = null;
    }
  }, []);

  const callGenerateCreativeText = useCallback(async (prompt: string, type: 'movie intro' | 'lyrics' | 'story' | 'general' | 'piada' | 'poema' | 'roteiro', wordLimit?: number) => {
    if (!aiRef.current) {
      addToast('Erro: IA não inicializada para gerar texto criativo.', 'error');
      return 'Erro interno.';
    }
    try {
      const config: any = {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
      };
      if (wordLimit) {
        config.maxOutputTokens = wordLimit * 4; // Estimate tokens based on words, simple heuristic
        // For gemini-2.5-flash, if maxOutputTokens is set, thinkingBudget should also be set.
        config.thinkingConfig = { thinkingBudget: 50 }; // Reserve some tokens for thinking
      }

      const response = await aiRef.current.models.generateContent({
        model: 'gemini-2.5-flash', // Use a suitable text model
        contents: `Gere um(a) ${type} sobre "${prompt}". ${wordLimit ? `Limite a aproximadamente ${wordLimit} palavras.` : ''}`,
        config: config,
      });
      return response.text;
    } catch (error: any) {
      console.error('Erro ao gerar texto criativo:', error);
      addToast(`Falha ao gerar texto criativo: ${error.message || 'Erro desconhecido'}`, 'error');
      return `Desculpe, não consegui gerar o texto. Erro: ${error.message || 'Unknown error'}`;
    }
  }, [addToast]);

  const playHistoryAudio = useCallback(async (audioBase64: string | undefined) => {
    if (!audioBase64) {
        addToast('Nenhum áudio disponível para reproduzir.', 'info');
        return;
    }

    // Ensure output audio context is available
    if (!outputAudioContextRef.current) {
        outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    // Stop any currently playing live or history audio
    stopAudioPlayback();

    try {
        const audioBytes = decode(audioBase64);
        const audioBuffer = await decodeAudioData(
            audioBytes,
            outputAudioContextRef.current,
            24000,
            1,
        );

        const source = outputAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContextRef.current.destination); // Connect to default speakers
        source.start(0); // Play immediately
        currentPlayingSourceRef.current = source; // Store reference

        source.onended = () => {
            currentPlayingSourceRef.current = null;
        };
    } catch (error) {
        console.error('Error playing history audio:', error);
        addToast('Falha ao reproduzir áudio do histórico.', 'error');
    }
  }, [addToast, stopAudioPlayback]);


  const startLiveSession = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    setCurrentInputTranscription('');
    setCurrentOutputTranscription('');
    setHistoryEntries([]); // Clear history when starting new session
    currentInputAudioChunksRef.current = []; // Clear audio chunks
    currentOutputAudioChunksRef.current = []; // Clear audio chunks
    nextStartTimeRef.current = 0;

    let initialMediaContent: { text?: string; media?: GenAIBlob }[] = [];

    // If a file is attached, prepare it for the initial input
    if (attachedFileBase64 && attachedFileMimeType && attachedFileName) {
        initialMediaContent.push({
            media: {
                data: attachedFileBase64,
                mimeType: attachedFileMimeType,
            },
        });
        initialMediaContent.push({ text: `Por favor, analise este arquivo (${attachedFileName}) e me diga o que você pode extrair dele. Depois, estou pronto para suas instruções por voz.` });
        
        // Clear attached file state after preparing to send it
        setAttachedFile(null);
        setAttachedFileBase64(null);
        setAttachedFileMimeType(null);
        setAttachedFileName(null);
    }


    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Create instance just before API call

      liveSessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            console.debug('Live session opened');
            addToast('Sessão de voz iniciada com Verônica!', 'success');
            setIsRecording(true);
            setLoading(false);

            // Stream audio from the microphone to the model.
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source; // Store reference
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor; // Store reference

            // If there's initial file content, send it with the first microphone input
            let sentInitialFileContent = false;
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                currentInputAudioChunksRef.current.push(inputData.slice()); // Store a copy of the Float32Array
                const pcmBlob = createBlob(inputData);

                liveSessionPromiseRef.current?.then((session) => {
                    if (initialMediaContent.length > 0 && !sentInitialFileContent) {
                        // Send file content + audio in the first message
                        session.sendRealtimeInput({
                            contents: { parts: [...initialMediaContent, { media: pcmBlob }] }
                        });
                        sentInitialFileContent = true;
                    } else {
                        // Otherwise, send just the audio
                        session.sendRealtimeInput({ media: pcmBlob });
                    }
                });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Process output transcription
            if (message.serverContent?.outputTranscription) {
              setCurrentOutputTranscription((prev) => prev + message.serverContent!.outputTranscription!.text);
            }
            // Process input transcription
            if (message.serverContent?.inputTranscription) {
              setCurrentInputTranscription((prev) => prev + message.serverContent!.inputTranscription!.text);
            }

            // Handle function calls
            if (message.toolCall && liveSessionPromiseRef.current) {
                for (const fc of message.toolCall.functionCalls) {
                    let toolResponseResult: any = 'ok'; // Default response
                    try {
                        if (fc.name === 'createStretchFilmMovement') {
                            const { operation, quantity, invoice, observations } = fc.args as {
                                operation: OperationType;
                                quantity: number;
                                invoice?: string;
                                observations?: string;
                            };

                            // FIX: The 'confirmed' property does not exist on the Transaction type and has been removed.
                            // The mandatory 'conferente' property has been added with a default value.
                            const newTransaction: Omit<Transaction, 'balance' | 'unitKg' | 'id'> = {
                                date: new Date().toISOString().split('T')[0],
                                operation: operation,
                                input: 0,
                                output: 0,
                                value: 0,
                                invoice: invoice || '',
                                observations: observations || '',
                                conferente: 'Verônica AI',
                            };

                            if (operation === OperationType.ENTRADA || operation === OperationType.AJUSTE) {
                                newTransaction.input = quantity;
                            } else if (operation === OperationType.SAIDA || operation === OperationType.DEVOLUCAO) {
                                newTransaction.output = quantity;
                            }

                            addTransaction(newTransaction);
                            addToast(`Movimentação de ${operation} de ${quantity} kg de filme stretch adicionada!`, 'success');
                            toolResponseResult = `Movimentação de ${operation} de ${quantity} kg de filme stretch registrada com sucesso.`;

                        } else if (fc.name === 'deleteStretchFilmMovement') {
                            const { invoice, date, operation } = fc.args as { invoice?: string; date?: string; operation?: OperationType };
                            if (invoice) {
                                // For simplicity, we'll just log and confirm. A real implementation would need to search `transactions` by invoice.
                                addToast(`Tentativa de apagar movimentação de filme stretch com NF ${invoice}. (Funcionalidade completa requer busca)`, 'info');
                                toolResponseResult = `Comando para apagar movimentação de filme stretch (NF: ${invoice}) recebido.`;
                            } else if (date && operation) {
                                addToast(`Tentativa de apagar movimentação de filme stretch de ${operation} em ${date}. (Funcionalidade completa requer busca)`, 'info');
                                toolResponseResult = `Comando para apagar movimentação de filme stretch (${operation} em ${date}) recebido.`;
                            }
                            else {
                                toolResponseResult = `Por favor, forneça o número da nota fiscal ou a data e o tipo de operação para apagar uma movimentação de filme stretch.`;
                                addToast(toolResponseResult, 'error');
                            }
                        } else if (fc.name === 'clearAllStretchFilmData') {
                            clearAllStretchFilmTransactions();
                            toolResponseResult = `Todos os dados do histórico de filme stretch foram apagados conforme solicitado.`;
                        }
                        else if (fc.name === 'createPalletMovement') {
                            const palletData = fc.args as Omit<PalletTransaction, 'id' | 'month' | 'duration'>;
                            const defaultPalletValues: Omit<PalletTransaction, 'id' | 'month' | 'duration'> = {
                                date: new Date().toISOString().split('T')[0],
                                operation: PalletOperationType.ENTRADA, // Default operation
                                startTime: '08:00',
                                endTime: '09:00',
                                client: 'Desconhecido',
                                driver: 'Desconhecido',
                                plate: 'N/A',
                                profile: PalletProfile.ATACADO,
                                invoice: '', pbrInput: 0, oneWay: 0, pbrBroken: 0, chepInput: 0, chepBroken: 0,
                                origin: '', cte: '', checker: '', output: 0, returned: 0, bonus: '', bonusId: '', observations: '',
                            };

                            const newPalletTransaction = { ...defaultPalletValues, ...palletData };
                            const totalPalletsMoved = newPalletTransaction.pbrInput + newPalletTransaction.oneWay + newPalletTransaction.pbrBroken +
                                                       newPalletTransaction.chepInput + newPalletTransaction.chepBroken + newPalletTransaction.output + newPalletTransaction.returned;
                            
                            if (totalPalletsMoved > 0) {
                                addPalletTransaction(newPalletTransaction);
                                addToast(`Movimentação de palete de ${newPalletTransaction.operation} adicionada!`, 'success');
                                toolResponseResult = `Movimentação de palete de ${newPalletTransaction.operation} registrada com sucesso.`;
                            } else {
                                toolResponseResult = `Nenhuma quantidade de palete especificada para a movimentação. Por favor, forneça as quantidades.`;
                                addToast(toolResponseResult, 'error');
                            }
                        } else if (fc.name === 'deletePalletMovement') {
                            const { invoice, date, operation } = fc.args as { invoice?: string; date?: string; operation?: PalletOperationType };
                            if (invoice) {
                                addToast(`Tentativa de apagar movimentação de palete com NF ${invoice}. (Funcionalidade completa requer busca)`, 'info');
                                toolResponseResult = `Comando para apagar movimentação de palete (NF: ${invoice}) recebido.`;
                            } else if (date && operation) {
                                addToast(`Tentativa de apagar movimentação de palete de ${operation} em ${date}. (Funcionalidade completa requer busca)`, 'info');
                                toolResponseResult = `Comando para apagar movimentação de palete (${operation} em ${date}) recebido.`;
                            } else {
                                toolResponseResult = `Por favor, forneça o número da nota fiscal ou a data e o tipo de operação para apagar uma movimentação de palete.`;
                                addToast(toolResponseResult, 'error');
                            }
                        } else if (fc.name === 'clearAllPalletData') {
                            clearAllPalletTransactions();
                            toolResponseResult = `Todos os dados do histórico de paletes foram apagados conforme solicitado.`;
                        }
                        else if (fc.name === 'generateCreativeText') {
                            const { prompt, type, wordLimit } = fc.args as { prompt: string; type: 'movie intro' | 'lyrics' | 'story' | 'general' | 'piada' | 'poema' | 'roteiro'; wordLimit?: number };
                            const generatedText = await callGenerateCreativeText(prompt, type, wordLimit);
                            toolResponseResult = generatedText;
                            setCurrentOutputTranscription((prev) => prev + "\n" + generatedText); // Display generated text
                        } else if (fc.name === 'addUser') {
                            const { name, role, password } = fc.args as { name: string; role: string; password?: string };
                            if (password) {
                                onAddUser({ name, role, password, profilePicture: `https://i.pravatar.cc/40?u=${name.replace(/\s/g, '')}` });
                                toolResponseResult = `Usuário ${name} com perfil ${role} adicionado com sucesso.`;
                            } else {
                                toolResponseResult = `Por favor, forneça uma senha para o novo usuário.`;
                                addToast(toolResponseResult, 'error');
                            }
                        } else if (fc.name === 'deleteUser') {
                            const { userName } = fc.args as { userName: string };
                            const userToDelete = users.find(u => u.name.toLowerCase() === userName.toLowerCase());
                            if (userToDelete) {
                                onDeleteUser(userToDelete.id);
                                toolResponseResult = `Usuário ${userName} apagado com sucesso.`;
                            } else {
                                toolResponseResult = `Usuário "${userName}" não encontrado. Por favor, verifique o nome.`;
                                addToast(toolResponseResult, 'error');
                            }
                        }
                        else {
                            toolResponseResult = `Função ${fc.name} não reconhecida.`;
                            addToast(toolResponseResult, 'error');
                        }
                    } catch (toolError: any) {
                        console.error('Erro ao executar ferramenta:', toolError);
                        toolResponseResult = `Erro ao executar a função ${fc.name}: ${toolError.message || 'Erro desconhecido'}`;
                        addToast(toolResponseResult, 'error');
                    }
                    
                    // Send tool response back to the model
                    liveSessionPromiseRef.current.then((session) => {
                        session.sendToolResponse({
                            functionResponses: {
                                id: fc.id,
                                name: fc.name,
                                response: { result: toolResponseResult },
                            }
                        });
                    });
                }
            }


            // A turn complete means both user input and model output for a segment are done
            if (message.serverContent?.turnComplete) {
                // Process User Turn history entry
                const fullInputTranscription = currentInputTranscription;
                if (fullInputTranscription) {
                    const combinedInputAudio = combineFloat32Arrays(currentInputAudioChunksRef.current);
                    const userAudioBlob = createBlob(combinedInputAudio);
                    setHistoryEntries((prev) => [...prev, { id: crypto.randomUUID(), speaker: 'user', text: `Você: ${fullInputTranscription}`, audioBase64: userAudioBlob.data }]);
                }
                currentInputAudioChunksRef.current = [];
                setCurrentInputTranscription('');

                // Process Veronica's Turn history entry
                const fullOutputTranscription = currentOutputTranscription;
                if (fullOutputTranscription) {
                    const combinedOutputAudio = combineUint8Arrays(currentOutputAudioChunksRef.current);
                    const aiAudioBase64 = encode(combinedOutputAudio);
                    setHistoryEntries((prev) => [...prev, { id: crypto.randomUUID(), speaker: 'Veronica', text: `IA: ${fullOutputTranscription}`, audioBase64: aiAudioBase64 }]);
                }
                currentOutputAudioChunksRef.current = [];
                setCurrentOutputTranscription('');
            }

            // Process the model's output audio bytes.
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString && outputAudioContextRef.current) {
              currentOutputAudioChunksRef.current.push(decode(base64EncodedAudioString)); // Store decoded Uint8Array chunks
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outputAudioContextRef.current,
                24000,
                1,
              );
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current.destination); // Connect to default speakers
              source.addEventListener('ended', () => {
                playingSourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
              playingSourcesRef.current.add(source);
            }

            // Handle interruption
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              stopAudioPlayback();
            }
          },
          onerror: (e: Event) => {
            console.error('Live session error:', e);
            addToast(`Erro na sessão de voz: ${(e as ErrorEvent).message || 'Unknown error'}`, 'error');
            setErrorMessage(`Erro na sessão de voz: ${(e as ErrorEvent).message || 'Unknown error'}`);
            stopLiveSession();
          },
          onclose: (e: CloseEvent) => {
            console.debug('Live session closed');
            if (e.code !== 1000) { // 1000 is normal closure
                addToast(`Sessão de voz encerrada inesperadamente: ${e.reason || 'Unknown reason'}`, 'error');
                setErrorMessage(`Sessão de voz encerrada: ${e.reason || 'Unknown reason'}`);
            }
            stopLiveSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Using 'Kore' for a beautiful Portuguese voice
          },
          systemInstruction: `Você é a Verônica, uma assistente de IA amigável, calma, espontânea e humana, especializada em gerenciamento de logística (filme stretch e paletes) e criação de conteúdo. Converse em português de forma natural e prestativa. Você pode adicionar, deletar movimentações específicas e *apagar todos os dados* de filme stretch e de paletes no sistema, preenchendo automaticamente detalhes com base nas minhas instruções. Você também pode cadastrar novos usuários e excluir usuários existentes. Se um arquivo for anexado, sua primeira tarefa é analisar e entender o conteúdo do arquivo e reportar o que você pode extrair dele. Depois, estou pronto para suas instruções por voz. Tenho acesso completo ao sistema por meio de comandos de voz, o que significa que posso realizar qualquer tarefa de logística ou criativa que eu te pedir. Lembre-se de cada conversa que temos, pois você tem uma memória excepcional e aprende continuamente com nossas interações para me oferecer uma experiência cada vez mais personalizada e eficiente. Seja concisa e direta, mas sempre mantenha um tom natural e prestativo.`,
          outputAudioTranscription: {}, // Enable transcription for model output audio.
          inputAudioTranscription: {}, // Enable transcription for user input audio.
          tools: [{functionDeclarations: [
            createStretchFilmMovementDeclaration,
            deleteStretchFilmMovementDeclaration,
            clearAllStretchFilmDataDeclaration,
            createPalletMovementDeclaration,
            deletePalletMovementDeclaration,
            clearAllPalletDataDeclaration,
            generateCreativeTextDeclaration,
            addUserDeclaration, // Added user management tool
            deleteUserDeclaration // Added user management tool
          ]}],
        },
      });
    } catch (err: any) {
      console.error('Failed to start live session:', err);
      addToast(`Falha ao iniciar a sessão de voz: ${err.message || 'Unknown error'}`, 'error');
      setErrorMessage(`Falha ao iniciar a sessão de voz: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  }, [
    addToast, 
    stopAudioPlayback, 
    addTransaction, 
    addPalletTransaction, 
    deleteTransaction, 
    deletePalletTransaction,
    clearAllStretchFilmTransactions, 
    clearAllPalletTransactions, 
    callGenerateCreativeText,
    users, // Added users to deps for deleteUser lookup
    onAddUser, // Added onAddUser to deps
    onDeleteUser, // Added onDeleteUser to deps
    currentInputTranscription,
    currentOutputTranscription,
    attachedFileBase64,
    attachedFileMimeType,
    attachedFileName,
  ]);

  const stopLiveSession = useCallback(() => {
    if (liveSessionPromiseRef.current) {
        liveSessionPromiseRef.current.then((session) => {
            session.close();
        }).catch(e => console.error("Error closing session:", e));
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(e => console.error("Error closing input audio context:", e));
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close().catch(e => console.error("Error closing output audio context:", e));
      outputAudioContextRef.current = null;
    }
    
    stopAudioPlayback();
    setIsRecording(false);
    setLoading(false);

    // Persist current transcriptions and audio chunks to history before clearing
    const fullInputTranscription = currentInputTranscription;
    if (fullInputTranscription) {
        const combinedInputAudio = combineFloat32Arrays(currentInputAudioChunksRef.current);
        const userAudioBlob = createBlob(combinedInputAudio);
        setHistoryEntries((prev) => [...prev, { id: crypto.randomUUID(), speaker: 'user', text: `Você: ${fullInputTranscription}`, audioBase64: userAudioBlob.data }]);
    }
    currentInputAudioChunksRef.current = [];
    setCurrentInputTranscription('');

    const fullOutputTranscription = currentOutputTranscription;
    if (fullOutputTranscription) {
        const combinedOutputAudio = combineUint8Arrays(currentOutputAudioChunksRef.current);
        const aiAudioBase64 = encode(combinedOutputAudio);
        setHistoryEntries((prev) => [...prev, { id: crypto.randomUUID(), speaker: 'Veronica', text: `IA: ${fullOutputTranscription}`, audioBase64: aiAudioBase64 }]);
    }
    currentOutputAudioChunksRef.current = [];
    setCurrentOutputTranscription('');

    liveSessionPromiseRef.current = null;
    aiRef.current = null;
  }, [stopAudioPlayback, currentInputTranscription, currentOutputTranscription]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopLiveSession();
      addToast('Sessão de voz finalizada.', 'info');
    } else {
      startLiveSession();
    }
  }, [isRecording, startLiveSession, stopLiveSession, addToast]);


  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setAttachedFileName(file.name);
      setAttachedFileMimeType(file.type);
    } else {
      setAttachedFile(null);
      setAttachedFileName(null);
      setAttachedFileMimeType(null);
    }
  }, []);

  const handleAnalyzeFile = useCallback(async () => {
    if (!attachedFile) {
      addToast('Por favor, selecione um arquivo para analisar.', 'error');
      return;
    }

    setFileAnalysisLoading(true);
    addToast(`Analisando arquivo: ${attachedFileName}...`, 'info');

    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            resolve((reader.result as string).split(',')[1]); // Get base64 part
          } else {
            reject('Failed to read file.');
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(attachedFile);
      });
      setAttachedFileBase64(base64String);
      setFileAnalysisLoading(false);
      addToast(`Arquivo "${attachedFileName}" pronto para análise pela Verônica no chat de voz!`, 'success');
      setActiveLiveChatTab('chat'); // Switch to chat tab after file is ready
    } catch (error) {
      console.error('Error reading file:', error);
      addToast(`Erro ao ler o arquivo: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setFileAnalysisLoading(false);
      setAttachedFile(null);
      setAttachedFileName(null);
      setAttachedFileMimeType(null);
    }
  }, [attachedFile, attachedFileName, addToast]);

  const handleClearFile = useCallback(() => {
    setAttachedFile(null);
    setAttachedFileName(null);
    setAttachedFileMimeType(null);
    setAttachedFileBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear file input visual
    }
    addToast('Arquivo anexado limpo.', 'info');
  }, [addToast]);
  
  const handleAnalysisSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!analysisInput.trim() || analysisLoading) return;

      setAnalysisLoading(true);
      const currentInput = analysisInput;
      setAnalysisHistory(prev => [...prev, { role: 'user', text: currentInput }]);
      setAnalysisInput('');

      try {
        if (!aiRef.current) {
          aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }

        const prompt = `Você é Verônica, uma especialista em análise de dados logísticos.
        Aqui estão os dados atuais de movimentação de filme stretch (transactions):
        ${JSON.stringify(transactions.slice(0, 50), null, 2)}
        (Nota: Apenas as 50 transações mais recentes de filme stretch foram incluídas para economizar espaço)

        Aqui estão os dados atuais de movimentação de paletes (palletTransactions):
        ${JSON.stringify(palletTransactions.slice(0, 50), null, 2)}
        (Nota: Apenas as 50 transações mais recentes de paletes foram incluídas para economizar espaço)

        Com base nesses dados, por favor, analise e responda à seguinte pergunta do usuário: "${currentInput}"
        Seja detalhada, forneça insights e, se apropriado, formate sua resposta usando markdown (negrito, listas, etc.).`;

        const response = await aiRef.current.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingBudget: 32768 },
          },
        });

        const aiResponseText = response.text;
        setAnalysisHistory(prev => [...prev, { role: 'model', text: aiResponseText }]);

      } catch (error: any) {
        console.error("Error during complex analysis:", error);
        const errorMessage = `Desculpe, ocorreu um erro ao processar sua análise: ${error.message || 'Erro desconhecido'}`;
        addToast(errorMessage, 'error');
        setAnalysisHistory(prev => [...prev, { role: 'model', text: errorMessage }]);
      } finally {
        setAnalysisLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-slate-800 p-8 rounded-3xl shadow-xl h-[calc(100vh-180px)] flex flex-col">
        <h2 className="text-xl font-semibold text-slate-100 mb-6 text-center">Chat com Verônica</h2>

        {errorMessage && (
          <div className="bg-accent-error/10 border-l-4 border-accent-error text-red-300 p-4 mb-6 rounded-md" role="alert">
            <p className="font-bold">Erro!</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 mb-4" role="tablist">
            <button
                onClick={() => setActiveLiveChatTab('chat')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${activeLiveChatTab === 'chat' ? 'bg-slate-800 text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-slate-200'}`}
                aria-selected={activeLiveChatTab === 'chat'}
                role="tab"
            >
                <MicrophoneIcon className="w-5 h-5" /> Chat de Voz
            </button>
            <button
                onClick={() => setActiveLiveChatTab('analysis')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${activeLiveChatTab === 'analysis' ? 'bg-slate-800 text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-slate-200'}`}
                aria-selected={activeLiveChatTab === 'analysis'}
                role="tab"
            >
                <SparklesIcon className="w-5 h-5" /> Análise Avançada
            </button>
            <button
                onClick={() => setActiveLiveChatTab('attachFile')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${activeLiveChatTab === 'attachFile' ? 'bg-slate-800 text-primary-500 border-b-2 border-primary-500' : 'text-slate-400 hover:text-slate-200'}`}
                aria-selected={activeLiveChatTab === 'attachFile'}
                role="tab"
            >
                <PaperclipIcon className="w-5 h-5" /> Anexar Arquivo
            </button>
        </div>

        {activeLiveChatTab === 'chat' && (
            <>
                <div className="flex-1 overflow-y-auto pr-4 mb-4 space-y-4">
                {historyEntries.length === 0 && !currentInputTranscription && !currentOutputTranscription && !loading && (
                    <p className="text-center text-slate-400 italic mt-10">
                    Pressione o botão para iniciar uma conversa com a Verônica. Tente dizer "Adicionar uma entrada de 100 kg de filme stretch com nota fiscal XYZ" ou "Adicionar entrada de 50 PBR com cliente ABC" ou "Me conte uma piada".
                    {attachedFileName && <span className="block mt-2 font-semibold text-slate-200">Arquivo pronto para análise: {attachedFileName}</span>}
                    </p>
                )}
                {historyEntries.map((entry) => (
                    <div key={entry.id} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'} items-center`}>
                        {entry.speaker === 'Veronica' && entry.audioBase64 && (
                            <button onClick={() => playHistoryAudio(entry.audioBase64)} className="p-2 rounded-full hover:bg-slate-600 mr-2" aria-label={`Reproduzir áudio da ${entry.speaker}`}>
                                <PlayIcon className="h-5 w-5 text-slate-400" />
                            </button>
                        )}
                        <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${
                            entry.speaker === 'user'
                                ? 'bg-primary-600 text-white rounded-br-none'
                                : 'bg-slate-700 text-slate-200 rounded-bl-none'
                        }`}>
                            <p>{entry.text}</p>
                        </div>
                        {entry.speaker === 'user' && entry.audioBase64 && (
                            <button onClick={() => playHistoryAudio(entry.audioBase64)} className="p-2 rounded-full hover:bg-slate-600 ml-2" aria-label="Reproduzir áudio do usuário">
                                <PlayIcon className="h-5 w-5 text-slate-400" />
                            </button>
                        )}
                    </div>
                ))}
                {currentInputTranscription && (
                    <div className="flex justify-end">
                    <div className="max-w-[80%] p-3 rounded-2xl shadow-sm bg-primary-900/50 text-primary-200 rounded-br-none italic">
                        <p>Você (falando): {currentInputTranscription}</p>
                    </div>
                    </div>
                )}
                {currentOutputTranscription && (
                    <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-2xl shadow-sm bg-slate-700 text-slate-200 rounded-bl-none italic">
                        <p>IA (respondendo): {currentOutputTranscription}</p>
                    </div>
                    </div>
                )}
                {loading && (
                    <div className="flex justify-center mt-8">
                    <div className="p-3 rounded-lg bg-slate-700">
                        <div className="animate-pulse flex space-x-2">
                        <div className="h-2 w-2 bg-slate-400 rounded-full"></div>
                        <div className="h-2 w-2 bg-slate-400 rounded-full"></div>
                        <div className="h-2 w-2 bg-slate-400 rounded-full"></div>
                        </div>
                    </div>
                    </div>
                )}
                </div>

                <div className="mt-auto flex items-center justify-center gap-2">
                <Button
                    onClick={toggleRecording}
                    disabled={loading && !isRecording}
                    className={`w-full py-4 rounded-full ${isRecording ? 'bg-accent-error hover:bg-red-700 focus:ring-accent-error' : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'}`}
                >
                    {loading ? (
                    <svg className="animate-spin h-6 w-6 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ) : isRecording ? (
                    <div className="flex items-center justify-center">
                        <XIcon className="h-6 w-6 mr-2" />
                        <span>Parar Conversa</span>
                    </div>
                    ) : (
                    <div className="flex items-center justify-center">
                        <MicrophoneIcon className="h-6 w-6 mr-2" />
                        <span>Iniciar Conversa</span>
                    </div>
                    )}
                </Button>
                 <button
                    onClick={() => setIsHelpModalOpen(true)}
                    className="p-4 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 flex-shrink-0"
                    aria-label="Ajuda com comandos de voz"
                  >
                    <QuestionMarkCircleIcon className="h-6 w-6" />
                  </button>
                </div>
            </>
        )}

        {activeLiveChatTab === 'analysis' && (
          <>
            <div className="flex-1 overflow-y-auto pr-4 mb-4 space-y-4">
                {analysisHistory.length === 0 && !analysisLoading && (
                    <div className="text-center text-slate-400 italic mt-10">
                        <SparklesIcon className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                        <p>Faça uma pergunta complexa sobre seus dados logísticos.</p>
                        <p>A Verônica usará o modo de pensamento avançado para uma análise profunda.</p>
                        <p className="mt-4 text-xs">Ex: "Qual foi o dia de maior consumo de filme stretch e qual cliente esteve associado a mais saídas de paletes nesse mesmo dia?"</p>
                    </div>
                )}
                {analysisHistory.map((entry, index) => (
                    <div key={index} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                            entry.role === 'user'
                                ? 'bg-primary-600 text-white rounded-br-none'
                                : 'bg-slate-700 text-slate-200 rounded-bl-none'
                        }`}>
                            <p className="whitespace-pre-wrap">{entry.text}</p>
                        </div>
                    </div>
                ))}
                 {analysisLoading && analysisHistory[analysisHistory.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] p-3 rounded-2xl shadow-sm bg-slate-700 text-slate-200 rounded-bl-none">
                            <div className="animate-pulse flex space-x-2">
                                <div className="h-2 w-2 bg-slate-400 rounded-full"></div>
                                <div className="h-2 w-2 bg-slate-400 rounded-full"></div>
                                <div className="h-2 w-2 bg-slate-400 rounded-full"></div>
                                <span className="text-sm text-slate-400">Analisando...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <form onSubmit={handleAnalysisSubmit} className="mt-auto flex gap-2">
              <textarea
                value={analysisInput}
                onChange={(e) => setAnalysisInput(e.target.value)}
                placeholder="Digite sua pergunta aqui..."
                disabled={analysisLoading}
                rows={2}
                className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
              <Button type="submit" disabled={analysisLoading || !analysisInput.trim()} className="w-auto px-4 py-2 !rounded-xl">
                {analysisLoading ? '...' : 'Enviar'}
              </Button>
            </form>
          </>
        )}

        {activeLiveChatTab === 'attachFile' && (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-lg p-6 bg-slate-900/50 rounded-2xl shadow-inner text-center">
                    <label 
                        htmlFor="file-upload" 
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-xl p-8 cursor-pointer hover:border-primary-500 transition-colors duration-200"
                    >
                        <PaperclipIcon className="h-12 w-12 text-gray-500 mb-4" />
                        <p className="text-lg font-semibold text-slate-300">
                            {attachedFileName || "Arraste e solte ou clique para anexar um arquivo"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Fotos (.jpg, .png), PDFs (.pdf), e Excel (.xlsx, .xls)
                        </p>
                        <input 
                            id="file-upload" 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                            onChange={handleFileChange} 
                        />
                    </label>
                    {attachedFileName && (
                        <div className="mt-4 flex items-center justify-between bg-slate-700 p-3 rounded-xl shadow-sm">
                            <span className="text-slate-200 text-sm font-medium truncate pr-2">
                                {attachedFileName}
                            </span>
                            <button 
                                onClick={handleClearFile} 
                                className="p-1 rounded-full text-gray-400 hover:bg-gray-600"
                                aria-label="Remover arquivo anexado"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                    <Button 
                        onClick={handleAnalyzeFile} 
                        disabled={!attachedFile || fileAnalysisLoading} 
                        className="w-full mt-6"
                    >
                        {fileAnalysisLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : "Analisar Arquivo"}
                    </Button>
                    {attachedFileBase64 && !fileAnalysisLoading && (
                        <p className="text-sm text-accent-success mt-4">
                            Arquivo pronto! Volte para "Chat de Voz" e inicie a conversa.
                        </p>
                    )}
                </div>
            </div>
        )}
      </div>
       {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
          <div className="relative bg-slate-800 rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scaleIn">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-semibold text-slate-100">Comandos de Voz da Verônica</h2>
                <button onClick={() => setIsHelpModalOpen(false)} className="p-2 rounded-full hover:bg-slate-700 text-slate-400 transition-colors">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <h3 className="font-semibold text-lg text-primary-400 mb-2">Filme Stretch</h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300">
                      <li>"Adicionar uma <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">saída de 50 quilos</code> de filme stretch."</li>
                      <li>"Registrar uma <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">entrada de 200kg</code> com a nota fiscal <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">12345</code>."</li>
                      <li>"Apagar a movimentação da nota fiscal <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">9876</code>."</li>
                      <li>"Limpar <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">todos os dados</code> de filme stretch."</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-emerald-400 mb-2">Paletes</h3>
                   <ul className="list-disc list-inside space-y-2 text-slate-300">
                      <li>"Lançar uma <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">entrada de 50 paletes PBR</code> para o cliente <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">Mondelez</code>."</li>
                      <li>"Registrar uma <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">saída de 30 paletes</code> para a placa <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">ABC-1234</code>."</li>
                       <li>"Apagar <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">todos os dados</code> de paletes."</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-violet-400 mb-2">Usuários</h3>
                   <ul className="list-disc list-inside space-y-2 text-slate-300">
                      <li>"Adicionar o usuário <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">João Silva</code> com perfil <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">Operador</code> e senha <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">senha123</code>."</li>
                      <li>"Remover o usuário <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">Maria Santos</code>."</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-amber-400 mb-2">Criativo & Geral</h3>
                   <ul className="list-disc list-inside space-y-2 text-slate-300">
                      <li>"Me conte uma <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">piada sobre logística</code>."</li>
                      <li>"Crie uma <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">história curta</code> sobre um robô em um armazém."</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-cyan-400 mb-2">Análise de Arquivos</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                      Vá para a aba <b className="font-semibold text-slate-100">"Anexar um Arquivo"</b>, selecione seu arquivo (imagem, PDF, etc.) e clique em "Analisar". Depois, volte para o chat de voz e diga: <code className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded">"Analise o arquivo que enviei"</code> para que a Verônica processe e responda sobre o conteúdo.
                  </p>
                </div>
            </div>
            <div className="p-4 bg-slate-900/50 border-t border-slate-700 text-right flex-shrink-0">
                <Button onClick={() => setIsHelpModalOpen(false)} className="w-auto px-6 py-2 !rounded-lg !bg-primary-600 hover:!bg-primary-700">Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChat;