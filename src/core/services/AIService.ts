import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import logger from "../lib/logger";
import { Collection } from "discord.js";

// Tipos mejorados para mejor type safety
interface ConversationContext {
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
        tokens: number;
    }>;
    totalTokens: number;
    imageRequests: number;
    lastActivity: number;
    userId: string;
    guildId?: string;
}

interface AIRequest {
    userId: string;
    guildId?: string;
    prompt: string;
    priority: 'low' | 'normal' | 'high';
    timestamp: number;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
}

// Utility function para manejar errores de forma type-safe
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'Error desconocido';
}

// Type guard para verificar si es un Error
function isError(error: unknown): error is Error {
    return error instanceof Error;
}

// Type guard para verificar errores de API específicos
function isAPIError(error: unknown): error is { message: string; code?: string } {
    return (
        error !== null &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as any).message === 'string'
    );
}

export class AIService {
    private genAI: GoogleGenerativeAI;
    private conversations = new Collection<string, ConversationContext>();
    private requestQueue: AIRequest[] = [];
    private processing = false;
    private userCooldowns = new Collection<string, number>();
    private rateLimitTracker = new Collection<string, { count: number; resetTime: number }>();
    
    // Configuración mejorada y escalable
    private readonly config = {
        maxInputTokens: 1048576,      // 1M tokens Gemini 2.5 Flash
        maxOutputTokens: 8192,        // Reducido para mejor rendimiento
        tokenResetThreshold: 0.80,    // Más conservador
        maxConversationAge: 30 * 60 * 1000, // 30 minutos
        maxMessageHistory: 8,         // Reducido para mejor memoria
        cooldownMs: 3000,            // 3 segundos entre requests
        maxImageRequests: 3,         // Reducido para evitar spam
        requestTimeout: 30000,       // 30 segundos timeout
        maxConcurrentRequests: 3,    // Máximo 3 requests simultáneos
        rateLimitWindow: 60000,      // 1 minuto
        rateLimitMax: 20,           // 20 requests por minuto por usuario
        cleanupInterval: 5 * 60 * 1000, // Limpiar cada 5 minutos
    };

    constructor() {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY no está configurada');
        }
        
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.startCleanupService();
        this.startQueueProcessor();
    }

    /**
     * Procesa una request de IA de forma asíncrona y controlada
     */
    async processAIRequest(
        userId: string, 
        prompt: string, 
        guildId?: string,
        priority: 'low' | 'normal' | 'high' = 'normal'
    ): Promise<string> {
        // Validaciones exhaustivas
        if (!prompt?.trim()) {
            throw new Error('El prompt no puede estar vacío');
        }

        if (prompt.length > 4000) {
            throw new Error('El prompt excede el límite de 4000 caracteres');
        }

        // Rate limiting por usuario
        if (!this.checkRateLimit(userId)) {
            throw new Error('Has excedido el límite de requests. Espera un momento.');
        }

        // Cooldown entre requests
        const lastRequest = this.userCooldowns.get(userId) || 0;
        const timeSinceLastRequest = Date.now() - lastRequest;
        
        if (timeSinceLastRequest < this.config.cooldownMs) {
            const waitTime = Math.ceil((this.config.cooldownMs - timeSinceLastRequest) / 1000);
            throw new Error(`Debes esperar ${waitTime} segundos antes de hacer otra consulta`);
        }

        // Agregar a la queue con Promise
        return new Promise((resolve, reject) => {
            const request: AIRequest = {
                userId,
                guildId,
                prompt: prompt.trim(),
                priority,
                timestamp: Date.now(),
                resolve,
                reject
            };

            // Insertar según prioridad
            if (priority === 'high') {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }

            // Timeout automático
            setTimeout(() => {
                const index = this.requestQueue.findIndex(r => r === request);
                if (index !== -1) {
                    this.requestQueue.splice(index, 1);
                    reject(new Error('Request timeout: La solicitud tardó demasiado tiempo'));
                }
            }, this.config.requestTimeout);

            this.userCooldowns.set(userId, Date.now());
        });
    }

    /**
     * Procesador de queue mejorado con control de concurrencia
     */
    private async startQueueProcessor(): Promise<void> {
        setInterval(async () => {
            if (this.processing || this.requestQueue.length === 0) return;
            
            this.processing = true;
            
            try {
                // Procesar hasta 3 requests simultáneamente
                const batch = this.requestQueue.splice(0, this.config.maxConcurrentRequests);
                
                await Promise.allSettled(
                    batch.map(request => this.processRequest(request))
                );
            } catch (error) {
                // Usar nuestro helper para manejar el error de forma type-safe
                const errorMessage = getErrorMessage(error);
                logger.error(`Error en el procesador de queue: ${errorMessage}`);

                // Si necesitamos más detalles del error, podemos usar type guards
                if (isError(error) && error.stack) {
                    logger.error(`Stack trace: ${error.stack}`);
                }
            } finally {
                this.processing = false;
            }
        }, 1000); // Revisar cada segundo
    }

    /**
     * Procesa una request individual con manejo completo de errores
     */
    private async processRequest(request: AIRequest): Promise<void> {
        try {
            const { userId, prompt, guildId } = request;
            
            // Obtener o crear contexto de conversación
            const context = this.getOrCreateContext(userId, guildId);
            
            // Verificar si es request de imagen
            const isImageRequest = this.detectImageRequest(prompt);
            if (isImageRequest && context.imageRequests >= this.config.maxImageRequests) {
                const error = new Error(`Has alcanzado el límite de ${this.config.maxImageRequests} solicitudes de imagen. La conversación se ha reiniciado.`);
                request.reject(error);
                return;
            }

            // Verificar límites de tokens
            const estimatedTokens = this.estimateTokens(prompt);
            if (context.totalTokens + estimatedTokens > this.config.maxInputTokens * this.config.tokenResetThreshold) {
                this.resetConversation(userId);
                logger.info(`Conversación reseteada para usuario ${userId} por límite de tokens`);
            }

            // Construir prompt del sistema optimizado
            const systemPrompt = this.buildSystemPrompt(prompt, context, isImageRequest);
            
            // Usar la API correcta de Google Generative AI
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.5-flash-preview-09-2025",
                generationConfig: {
                    maxOutputTokens: Math.min(this.config.maxOutputTokens, Math.max(1024, estimatedTokens * 0.5)),
                    temperature: 0.7,
                    topP: 0.85,
                    topK: 40,
                },
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    }
                ]
            });

            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            const aiResponse = response.text()?.trim();

            if (!aiResponse) {
                const error = new Error('La IA no generó una respuesta válida');
                request.reject(error);
                return;
            }

            // Actualizar contexto de forma eficiente
            this.updateContext(context, prompt, aiResponse, estimatedTokens, isImageRequest);
            
            request.resolve(aiResponse);
            
        } catch (error) {
            // Manejo type-safe de errores sin ts-ignore
            const errorMessage = this.parseAPIError(error);
            const logMessage = getErrorMessage(error);
            logger.error(`Error procesando AI request para ${request.userId}: ${logMessage}`);

            // Log adicional si es un Error con stack trace
            if (isError(error) && error.stack) {
                logger.error(`Stack trace completo: ${error.stack}`);
            }

            request.reject(new Error(errorMessage));
        }
    }

    /**
     * Construcción optimizada del prompt del sistema
     */
    private buildSystemPrompt(userPrompt: string, context: ConversationContext, isImageRequest: boolean): string {
        const recentMessages = context.messages
            .slice(-4) // Solo los últimos 4 mensajes
            .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
            .join('\n');

        return `Eres una hermana mayor kawaii y cariñosa que habla por Discord. Responde de manera natural, útil y concisa.

## Reglas Discord:
- USA **markdown de Discord**: **negrita**, *cursiva*, \`código\`, \`\`\`bloques\`\`\`
- NUNCA uses LaTeX ($$)
- Máximo 2-3 emojis por respuesta
- Respuestas concisas y claras

${isImageRequest ? `
## Limitación:
- No puedes generar imágenes
- Ofrece ayuda alternativa (descripciones, recursos, etc.)
` : ''}

## Contexto reciente:
${recentMessages || 'Sin historial previo'}

## Consulta actual:
${userPrompt}

Responde de forma directa y útil:`;
    }

    /**
     * Sistema de rate limiting mejorado
     */
    private checkRateLimit(userId: string): boolean {
        const now = Date.now();
        const userLimit = this.rateLimitTracker.get(userId);
        
        if (!userLimit || now > userLimit.resetTime) {
            this.rateLimitTracker.set(userId, {
                count: 1,
                resetTime: now + this.config.rateLimitWindow
            });
            return true;
        }
        
        if (userLimit.count >= this.config.rateLimitMax) {
            return false;
        }
        
        userLimit.count++;
        return true;
    }

    /**
     * Detección mejorada de requests de imagen
     */
    private detectImageRequest(prompt: string): boolean {
        const imageKeywords = [
            'imagen', 'image', 'dibujo', 'draw', 'dibujar',
            'generar imagen', 'create image', 'picture', 'foto',
            'ilustración', 'arte', 'pintura', 'sketch'
        ];
        
        const lowerPrompt = prompt.toLowerCase();
        return imageKeywords.some(keyword => lowerPrompt.includes(keyword));
    }

    /**
     * Estimación de tokens más precisa
     */
    private estimateTokens(text: string): number {
        // Aproximación mejorada basada en la tokenización real
        const words = text.split(/\s+/).length;
        const chars = text.length;
        
        // Fórmula híbrida más precisa
        return Math.ceil((words * 1.3) + (chars * 0.25));
    }

    /**
     * Obtener o crear contexto de conversación
     */
    private getOrCreateContext(userId: string, guildId?: string): ConversationContext {
        const key = `${userId}-${guildId || 'dm'}`;
        let context = this.conversations.get(key);
        
        if (!context) {
            context = {
                messages: [],
                totalTokens: 0,
                imageRequests: 0,
                lastActivity: Date.now(),
                userId,
                guildId
            };
            this.conversations.set(key, context);
        }
        
        context.lastActivity = Date.now();
        return context;
    }

    /**
     * Actualizar contexto de forma eficiente
     */
    private updateContext(
        context: ConversationContext, 
        userPrompt: string, 
        aiResponse: string, 
        inputTokens: number,
        isImageRequest: boolean
    ): void {
        const outputTokens = this.estimateTokens(aiResponse);
        const now = Date.now();
        
        // Agregar mensajes
        context.messages.push(
            { role: 'user', content: userPrompt, timestamp: now, tokens: inputTokens },
            { role: 'assistant', content: aiResponse, timestamp: now, tokens: outputTokens }
        );
        
        // Mantener solo los mensajes más recientes
        if (context.messages.length > this.config.maxMessageHistory) {
            const removed = context.messages.splice(0, context.messages.length - this.config.maxMessageHistory);
            const removedTokens = removed.reduce((sum, msg) => sum + msg.tokens, 0);
            context.totalTokens -= removedTokens;
        }
        
        context.totalTokens += inputTokens + outputTokens;
        context.lastActivity = now;
        
        if (isImageRequest) {
            context.imageRequests++;
        }
    }

    /**
     * Resetear conversación
     */
    private resetConversation(userId: string, guildId?: string): void {
        const key = `${userId}-${guildId || 'dm'}`;
        this.conversations.delete(key);
    }

    /**
     * Servicio de limpieza automática
     */
    private startCleanupService(): void {
        setInterval(() => {
            const now = Date.now();
            const toDelete: string[] = [];
            
            this.conversations.forEach((context, key) => {
                if (now - context.lastActivity > this.config.maxConversationAge) {
                    toDelete.push(key);
                }
            });
            
            toDelete.forEach(key => this.conversations.delete(key));
            
            if (toDelete.length > 0) {
                logger.info(`Limpieza automática: ${toDelete.length} conversaciones expiradas eliminadas`);
            }
        }, this.config.cleanupInterval);
    }

    /**
     * Parser mejorado de errores de API - Type-safe sin ts-ignore
     */
    private parseAPIError(error: unknown): string {
        // Extraer mensaje de forma type-safe
        const message = getErrorMessage(error).toLowerCase();

        // Verificar si es un error de API estructurado
        if (isAPIError(error)) {
            const apiMessage = error.message.toLowerCase();

            if (apiMessage.includes('api key') || apiMessage.includes('authentication')) {
                return 'Error de autenticación con la API de IA';
            }
            if (apiMessage.includes('quota') || apiMessage.includes('exceeded')) {
                return 'Se ha alcanzado el límite de uso de la API. Intenta más tarde';
            }
            if (apiMessage.includes('safety') || apiMessage.includes('blocked')) {
                return 'Tu mensaje fue bloqueado por las políticas de seguridad';
            }
            if (apiMessage.includes('timeout') || apiMessage.includes('deadline')) {
                return 'La solicitud tardó demasiado tiempo. Intenta de nuevo';
            }
            if (apiMessage.includes('model not found')) {
                return 'El modelo de IA no está disponible en este momento';
            }
            if (apiMessage.includes('token') || apiMessage.includes('length')) {
                return 'El mensaje excede los límites permitidos';
            }
        }

        // Manejo genérico para otros tipos de errores
        if (message.includes('api key') || message.includes('authentication')) {
            return 'Error de autenticación con la API de IA';
        }
        if (message.includes('quota') || message.includes('exceeded')) {
            return 'Se ha alcanzado el límite de uso de la API. Intenta más tarde';
        }
        if (message.includes('safety') || message.includes('blocked')) {
            return 'Tu mensaje fue bloqueado por las políticas de seguridad';
        }
        if (message.includes('timeout') || message.includes('deadline')) {
            return 'La solicitud tardó demasiado tiempo. Intenta de nuevo';
        }
        if (message.includes('model not found')) {
            return 'El modelo de IA no está disponible en este momento';
        }
        if (message.includes('token') || message.includes('length')) {
            return 'El mensaje excede los límites permitidos';
        }
        
        return 'Error temporal del servicio de IA. Intenta de nuevo';
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats(): {
        activeConversations: number;
        queueLength: number;
        totalRequests: number;
        averageResponseTime: number;
    } {
        return {
            activeConversations: this.conversations.size,
            queueLength: this.requestQueue.length,
            totalRequests: this.userCooldowns.size,
            averageResponseTime: 0
        };
    }
}

// Instancia singleton
export const aiService = new AIService();
