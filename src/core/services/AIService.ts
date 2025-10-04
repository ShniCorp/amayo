import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// New: modern GenAI SDK for image generation
import { GoogleGenAI } from "@google/genai";
import logger from "../lib/logger";
import { Collection } from "discord.js";
import { prisma } from "../database/prisma";
import { getDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_AI_CONVERSATIONS_ID, isAIConversationsConfigured } from "../api/appwrite";

// Tipos mejorados para mejor type safety
interface ConversationContext {
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
        tokens: number;
        messageId?: string; // ID del mensaje de Discord
        referencedMessageId?: string; // ID del mensaje al que responde
    }>;
    totalTokens: number;
    imageRequests: number;
    lastActivity: number;
    userId: string;
    guildId?: string;
    channelId?: string;
    conversationId?: string; // ID único de la conversación
}

interface AIRequest {
    userId: string;
    guildId?: string;
    channelId?: string;
    prompt: string;
    priority: 'low' | 'normal' | 'high';
    timestamp: number;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
    aiRolePrompt?: string;
    meta?: string;
    messageId?: string;
    referencedMessageId?: string;
}

interface AppwriteConversation {
    userId: string;
    guildId?: string;
    channelId?: string;
    conversationId: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
        messageId?: string;
        referencedMessageId?: string;
    }>;
    lastActivity: number;
    createdAt: number;
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
        return String((error as any).message);
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
    // New: client for modern GenAI features (images)
    private genAIv2: any;
    private conversations = new Collection<string, ConversationContext>();
    private requestQueue: AIRequest[] = [];
    private processing = false;
    private userCooldowns = new Collection<string, number>();
    private rateLimitTracker = new Collection<string, { count: number; resetTime: number }>();
    // Cache de configuración por guild
    private guildPromptCache = new Collection<string, { prompt: string | null; fetchedAt: number }>();

    // Configuración mejorada y escalable
    private readonly config = {
        maxInputTokens: 1048576,      // 1M tokens Gemini 2.5 Flash (entrada)
        maxOutputTokens: 65536,       // 65,536 salida (según aclaración del usuario para preview 09-2025)
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
        guildConfigTTL: 5 * 60 * 1000, // 5 minutos de cache para prompts de guild
    } as const;

    constructor() {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY no está configurada');
        }
        
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Initialize modern SDK (lo tratamos como any para compatibilidad de tipos)
        try {
            this.genAIv2 = new GoogleGenAI({ apiKey });
        } catch {
            this.genAIv2 = null;
        }
        this.startCleanupService();
        this.startQueueProcessor();
    }

    /**
     * Obtener prompt de rol de IA por guild con caché
     */
    public async getGuildAiPrompt(guildId: string): Promise<string | null> {
        try {
            const cached = this.guildPromptCache.get(guildId);
            const now = Date.now();
            if (cached && (now - cached.fetchedAt) < this.config.guildConfigTTL) {
                return cached.prompt;
            }
            // @ts-ignore
            const guild = await prisma.guild.findUnique({ where: { id: guildId }, select: { aiRolePrompt: true } });
            //@ts-ignore
            const prompt = guild?.aiRolePrompt ?? null;
            this.guildPromptCache.set(guildId, { prompt, fetchedAt: now });
            return prompt;
        } catch (e) {
            logger.warn(`No se pudo cargar aiRolePrompt para guild ${guildId}: ${getErrorMessage(e)}`);
            return null;
        }
    }

    /**
     * Invalidar cache de configuración de un guild (llamar tras guardar cambios)
     */
    public invalidateGuildConfig(guildId: string): void {
        this.guildPromptCache.delete(guildId);
    }

    /**
     * Procesa una request de IA de forma asíncrona y controlada
     */
    async processAIRequest(
        userId: string, 
        prompt: string, 
        guildId?: string,
        priority: 'low' | 'normal' | 'high' = 'normal',
        options?: { aiRolePrompt?: string; meta?: string }
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
                reject,
                aiRolePrompt: options?.aiRolePrompt,
                meta: options?.meta,
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
     * Parser de errores (versión legacy no utilizada)
     */
    private parseAPIErrorLegacy(error: unknown): string {
        // Delegar a la versión nueva
        return this.parseAPIError(error);
    }

    /**
     * Versión legacy de processAIRequestWithMemory (sin uso externo)
     */
    async processAIRequestWithMemoryLegacy(
        userId: string,
        prompt: string,
        guildId?: string,
        channelId?: string,
        messageId?: string,
        referencedMessageId?: string,
        client?: any,
        priority: 'low' | 'normal' | 'high' = 'normal',
        options?: { aiRolePrompt?: string; meta?: string; attachments?: any[] }
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
            const request: AIRequest & { client?: any; attachments?: any[] } = {
                userId,
                guildId,
                channelId,
                prompt: prompt.trim(),
                priority,
                timestamp: Date.now(),
                resolve,
                reject,
                aiRolePrompt: options?.aiRolePrompt,
                meta: options?.meta,
                messageId,
                referencedMessageId,
                client,
                attachments: options?.attachments
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
     * Procesa una request de IA con soporte para conversaciones y memoria persistente
     */
    async processAIRequestWithMemory(
        userId: string,
        prompt: string,
        guildId?: string,
        channelId?: string,
        messageId?: string,
        referencedMessageId?: string,
        client?: any,
        priority: 'low' | 'normal' | 'high' = 'normal',
        options?: { aiRolePrompt?: string; meta?: string; attachments?: any[] }
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
            const request: AIRequest & { client?: any; attachments?: any[] } = {
                userId,
                guildId,
                channelId,
                prompt: prompt.trim(),
                priority,
                timestamp: Date.now(),
                resolve,
                reject,
                aiRolePrompt: options?.aiRolePrompt,
                meta: options?.meta,
                messageId,
                referencedMessageId,
                client,
                attachments: options?.attachments
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
     * Procesa una request individual con manejo completo de errores y memoria persistente
     */
    private async processRequest(request: AIRequest): Promise<void> {
        try {
            const { userId, prompt, guildId, channelId, messageId, referencedMessageId } = request;
            const context = await this.getOrCreateContextWithMemory(userId, guildId, channelId);

            // Obtener imágenes adjuntas si existen
            const messageAttachments = (request as any).attachments || [];
            const hasImages = this.hasImageAttachments(messageAttachments);
            const isImageRequest = this.detectImageRequest(prompt);

            if (isImageRequest && context.imageRequests >= this.config.maxImageRequests) {
                const error = new Error(`Has alcanzado el límite de ${this.config.maxImageRequests} solicitudes de imagen. La conversación se ha reiniciado.`);
                request.reject(error);
                return;
            }

            // Verificar límites de tokens
            const estimatedTokens = this.estimateTokens(prompt);
            if (context.totalTokens + estimatedTokens > this.config.maxInputTokens * this.config.tokenResetThreshold) {
                this.resetConversation(userId, guildId);
                logger.info(`Conversación reseteada para usuario ${userId} por límite de tokens`);
            }

            // Obtener prompt del sistema (desde opciones o DB)
            let effectiveAiRolePrompt = request.aiRolePrompt;
            if (effectiveAiRolePrompt === undefined && guildId) {
                effectiveAiRolePrompt = (await this.getGuildAiPrompt(guildId)) ?? undefined;
            }

            // Obtener jerarquía de roles si está en un servidor
            let roleHierarchy = '';
            if (guildId) {
                const client = (request as any).client;
                if (client) {
                    roleHierarchy = await this.getGuildRoleHierarchy(guildId, client);
                }
            }

            // Construir metadatos mejorados
            const enhancedMeta = (request.meta || '') + roleHierarchy;

            // Construir prompt del sistema optimizado
            let systemPrompt = this.buildSystemPrompt(
                prompt,
                context,
                isImageRequest,
                effectiveAiRolePrompt,
                enhancedMeta
            );

            // Procesar imágenes si las hay
            let imageAttachments: any[] = [];
            if (hasImages) {
                imageAttachments = await this.processImageAttachments(messageAttachments);
                if (imageAttachments.length > 0) {
                    systemPrompt = `${systemPrompt}\n\n## Imágenes adjuntas:\nPor favor, analiza las imágenes proporcionadas y responde de acuerdo al contexto.`;
                }
            }

            // Usar gemini-2.5-flash-preview-09-2025 que puede leer imágenes y responder con texto
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

            // Construir el contenido para la API
            let content: any;
            if (hasImages && imageAttachments.length > 0) {
                // Para multimodal (texto + imágenes)
                content = [
                    { text: systemPrompt },
                    ...imageAttachments
                ];
                logger.info(`Procesando ${imageAttachments.length} imagen(es) con Gemini Vision`);
            } else {
                // Solo texto
                content = systemPrompt;
            }

            const result = await model.generateContent(content);
            const response = await result.response;
            const aiResponse = response.text()?.trim();

            if (!aiResponse) {
                const error = new Error('La IA no generó una respuesta válida');
                request.reject(error);
                return;
            }

            // Actualizar contexto con memoria persistente
            await this.updateContextWithMemory(
                context,
                prompt,
                aiResponse,
                estimatedTokens,
                isImageRequest || hasImages,
                messageId,
                referencedMessageId
            );

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
    private buildSystemPrompt(
        userPrompt: string,
        context: ConversationContext,
        isImageRequest: boolean,
        aiRolePrompt?: string,
        meta?: string
    ): string {
        const recentMessages = context.messages
            .slice(-4)
            .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
            .join('\n');

        const roleBlock = aiRolePrompt && aiRolePrompt.trim() ? `\n## Rol del sistema (servidor):\n${aiRolePrompt.trim().slice(0, 1200)}\n` : '';
        const metaBlock = meta && meta.trim() ? `\n## Contexto del mensaje:\n${meta.trim().slice(0, 800)}\n` : '';

        return `Eres una hermana mayor kawaii y cariñosa que habla por Discord. Responde de manera natural, útil y concisa.${roleBlock}${metaBlock}

## Reglas Discord:
- USA **markdown de Discord**: **negrita**, *cursiva*, \`código\`, \`\`\`bloques\`\`\`
- NUNCA uses LaTeX ($$)
- Máximo 2-3 emojis por respuesta
- Prefiere emojis Unicode estándar (🙂, 🎯, etc.) cuando no haya más contexto
- Si se te proporciona una lista de "Emojis personalizados disponibles", puedes usarlos escribiendo :nombre: exactamente como aparece; NO inventes nombres
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
     * Detectar si hay imágenes adjuntas en el mensaje para análisis (método público)
     */
    public hasImageAttachments(attachments?: any[]): boolean {
        if (!attachments || attachments.length === 0) return false;

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

        return attachments.some(attachment => {
            const hasImageExtension = imageExtensions.some(ext =>
                attachment.name?.toLowerCase().endsWith(ext)
            );
            const hasImageMimeType = imageMimeTypes.includes(attachment.contentType?.toLowerCase());

            return hasImageExtension || hasImageMimeType;
        });
    }

    /**
     * Detectar si hay imágenes adjuntas en el mensaje para análisis (método privado)
     */
    private hasImageAttachmentsPrivate(attachments?: any[]): boolean {
        if (!attachments || attachments.length === 0) return false;

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

        return attachments.some(attachment => {
            const hasImageExtension = imageExtensions.some(ext =>
                attachment.name?.toLowerCase().endsWith(ext)
            );
            const hasImageMimeType = imageMimeTypes.includes(attachment.contentType?.toLowerCase());

            return hasImageExtension || hasImageMimeType;
        });
    }

    /**
     * Procesar imágenes adjuntas para análisis con Gemini Vision
     */
    private async processImageAttachments(attachments: any[]): Promise<any[]> {
        const imageAttachments = [];

        for (const attachment of attachments) {
            if (this.hasImageAttachments([attachment])) {
                try {
                    // Descargar la imagen
                    const response = await fetch(attachment.url);
                    if (!response.ok) {
                        logger.warn(`Error descargando imagen: ${response.statusText}`);
                        continue;
                    }

                    const arrayBuffer = await response.arrayBuffer();
                    const base64Data = Buffer.from(arrayBuffer).toString('base64');

                    // Determinar el tipo MIME
                    let mimeType = attachment.contentType || 'image/png';
                    if (!mimeType.startsWith('image/')) {
                        // Inferir del nombre del archivo
                        const ext = attachment.name?.toLowerCase().split('.').pop();
                        switch (ext) {
                            case 'jpg':
                            case 'jpeg':
                                mimeType = 'image/jpeg';
                                break;
                            case 'png':
                                mimeType = 'image/png';
                                break;
                            case 'gif':
                                mimeType = 'image/gif';
                                break;
                            case 'webp':
                                mimeType = 'image/webp';
                                break;
                            default:
                                mimeType = 'image/png';
                        }
                    }

                    imageAttachments.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    });

                    logger.debug(`Imagen procesada: ${attachment.name} (${mimeType})`);
                } catch (error) {
                    logger.warn(`Error procesando imagen ${attachment.name}: ${getErrorMessage(error)}`);
                }
            }
        }

        return imageAttachments;
    }

    /**
     * Procesa una request de IA con soporte para imágenes adjuntas
     */
    async processAIRequestWithAttachments(
        userId: string,
        prompt: string,
        attachments: any[],
        guildId?: string,
        channelId?: string,
        messageId?: string,
        referencedMessageId?: string,
        client?: any,
        priority: 'low' | 'normal' | 'high' = 'normal',
        options?: { aiRolePrompt?: string; meta?: string }
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

        // Procesar imágenes adjuntas
        let imageAnalysisResults = [];
        if (attachments && attachments.length > 0) {
            imageAnalysisResults = await this.processImageAttachments(attachments);
        }

        // Agregar a la queue con Promise
        return new Promise((resolve, reject) => {
            const request: AIRequest = {
                userId,
                guildId,
                channelId,
                prompt: prompt.trim(),
                priority,
                timestamp: Date.now(),
                resolve,
                reject,
                aiRolePrompt: options?.aiRolePrompt,
                meta: options?.meta,
                messageId,
                referencedMessageId,
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
     * Procesar request de IA con imágenes adjuntas
     */
    private async processRequestWithAttachments(request: AIRequest, imageAttachments: any[]): Promise<void> {
        try {
            const { userId, prompt, guildId, channelId, messageId, referencedMessageId } = request;
            const context = await this.getOrCreateContextWithMemory(userId, guildId, channelId);
            const isImageRequest = this.detectImageRequest(prompt);

            // Si el prompt es una solicitud de imagen, pero ya se alcanzó el límite, reiniciar conversación
            if (isImageRequest && context.imageRequests >= this.config.maxImageRequests) {
                this.resetConversation(userId, guildId);
                logger.info(`Conversación reseteada para usuario ${userId} por límite de solicitudes de imagen`);
            }

            // Verificar límites de tokens
            const estimatedTokens = this.estimateTokens(prompt);
            if (context.totalTokens + estimatedTokens > this.config.maxInputTokens * this.config.tokenResetThreshold) {
                this.resetConversation(userId, guildId);
                logger.info(`Conversación reseteada para usuario ${userId} por límite de tokens`);
            }

            // Obtener prompt del sistema (desde opciones o DB)
            let effectiveAiRolePrompt = request.aiRolePrompt;
            if (effectiveAiRolePrompt === undefined && guildId) {
                effectiveAiRolePrompt = (await this.getGuildAiPrompt(guildId)) ?? undefined;
            }

            // Obtener jerarquía de roles si está en un servidor
            let roleHierarchy = '';
            if (guildId) {
                // Necesitamos acceso al cliente de Discord - lo pasaremos desde el comando
                const client = (request as any).client;
                if (client) {
                    roleHierarchy = await this.getGuildRoleHierarchy(guildId, client);
                }
            }

            // Construir metadatos mejorados
            const enhancedMeta = (request.meta || '') + roleHierarchy;

            // Construir prompt del sistema optimizado
            const systemPrompt = this.buildSystemPrompt(
                prompt,
                context,
                isImageRequest,
                effectiveAiRolePrompt,
                enhancedMeta
            );

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

            // Actualizar contexto con memoria persistente
            await this.updateContextWithMemory(
                context,
                prompt,
                aiResponse,
                estimatedTokens,
                isImageRequest,
                messageId,
                referencedMessageId
            );

            request.resolve(aiResponse);

        } catch (error) {
            // Manejo type-safe de errores sin ts-ignore
            const errorMessage = this.parseAPIError(error);
            const logMessage = getErrorMessage(error);
            logger.error(`Error procesando AI request con imágenes para ${request.userId}: ${logMessage}`);

            // Log adicional si es un Error con stack trace
            if (isError(error) && error.stack) {
                logger.error(`Stack trace completo: ${error.stack}`);
            }

            request.reject(new Error(errorMessage));
        }
    }

    /**
     * Obtener o crear contexto de conversación (método legacy)
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
     * Actualizar contexto de forma eficiente (método legacy)
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
     * Actualizar contexto de forma eficiente con guardado en Appwrite
     */
    private async updateContextWithMemory(
        context: ConversationContext,
        userPrompt: string,
        aiResponse: string,
        inputTokens: number,
        isImageRequest: boolean,
        messageId?: string,
        referencedMessageId?: string
    ): Promise<void> {
        const outputTokens = this.estimateTokens(aiResponse);
        const now = Date.now();

        // Agregar mensajes con IDs de Discord
        context.messages.push(
            {
                role: 'user',
                content: userPrompt,
                timestamp: now,
                tokens: inputTokens,
                messageId,
                referencedMessageId
            },
            {
                role: 'assistant',
                content: aiResponse,
                timestamp: now,
                tokens: outputTokens
            }
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

        // Guardar en Appwrite de forma asíncrona
        this.saveConversationToAppwrite(context).catch(error => {
            logger.warn(`Error guardando conversación: ${getErrorMessage(error)}`);
        });
    }

    /**
     * Obtener o crear contexto de conversación con carga desde Appwrite
     */
    private async getOrCreateContextWithMemory(userId: string, guildId?: string, channelId?: string): Promise<ConversationContext> {
        const key = `${userId}-${guildId || 'dm'}`;
        let context = this.conversations.get(key);

        if (!context) {
            // Intentar cargar desde Appwrite
            const loadedContext = await this.loadConversationFromAppwrite(userId, guildId, channelId);

            if (loadedContext) {
                context = loadedContext;
            } else {
                // Crear nuevo contexto si no existe en Appwrite
                context = {
                    messages: [],
                    totalTokens: 0,
                    imageRequests: 0,
                    lastActivity: Date.now(),
                    userId,
                    guildId,
                    channelId
                };
            }

            this.conversations.set(key, context);
        }

        context.lastActivity = Date.now();
        return context;
    }

    /**
     * Limpiar cache pero mantener memoria persistente
     */
    public clearCache(): void {
        this.conversations.clear();
        this.userCooldowns.clear();
        this.rateLimitTracker.clear();
        this.guildPromptCache.clear();
        logger.info('Cache de AI limpiado, memoria persistente mantenida');
    }

    /**
     * Reset completo pero mantener memoria persistente
     */
    public fullReset(): void {
        this.clearCache();
        this.requestQueue.length = 0;
        logger.info('AI completamente reseteada, memoria persistente mantenida');
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

    /**
     * Guardar conversación en Appwrite para memoria persistente
     */
    private async saveConversationToAppwrite(context: ConversationContext): Promise<void> {
        if (!isAIConversationsConfigured()) {
            return; // Si no está configurado, no guardamos
        }

        try {
            const databases = getDatabases();
            if (!databases) return;

            // Generar un ID válido para Appwrite (máximo 36 caracteres, solo a-z, A-Z, 0-9, ., -, _)
            let conversationId = context.conversationId;
            if (!conversationId) {
                // Crear un ID más corto y válido
                const userIdShort = context.userId.slice(-8); // Últimos 8 caracteres del userId
                const guildIdShort = context.guildId ? context.guildId.slice(-8) : 'dm';
                const timestamp = Date.now().toString(36); // Base36 para hacer más corto
                conversationId = `ai_${userIdShort}_${guildIdShort}_${timestamp}`;

                // Asegurar que no exceda 36 caracteres
                if (conversationId.length > 36) {
                    conversationId = conversationId.slice(0, 36);
                }

                context.conversationId = conversationId;
            }

            const appwriteData: AppwriteConversation = {
                userId: context.userId,
                guildId: context.guildId,
                channelId: context.channelId,
                conversationId,
                messages: context.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    messageId: msg.messageId,
                    referencedMessageId: msg.referencedMessageId
                })),
                lastActivity: context.lastActivity,
                createdAt: Date.now()
            };

            // Usar upsert para actualizar si ya existe
            try {
                await databases.updateDocument(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_AI_CONVERSATIONS_ID,
                    conversationId,
                    appwriteData
                );
            } catch (updateError) {
                // Si no existe, crearlo
                await databases.createDocument(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_AI_CONVERSATIONS_ID,
                    conversationId,
                    appwriteData
                );
            }

            logger.debug(`Conversación guardada en Appwrite: ${conversationId}`);
        } catch (error) {
            logger.warn(`Error guardando conversación en Appwrite: ${getErrorMessage(error)}`);
        }
    }

    /**
     * Cargar conversación desde Appwrite
     */
    private async loadConversationFromAppwrite(userId: string, guildId?: string, channelId?: string): Promise<ConversationContext | null> {
        if (!isAIConversationsConfigured()) {
            return null;
        }

        try {
            const databases = getDatabases();
            if (!databases) return null;

            // Construir queries válidas para Appwrite
            const queries = [];

            // Query por userId (siempre requerido)
            queries.push(`userId="${userId}"`);

            // Query por guildId si existe
            if (guildId) {
                queries.push(`guildId="${guildId}"`);
            }

            // Query por channelId si existe
            if (channelId) {
                queries.push(`channelId="${channelId}"`);
            }

            // Buscar conversaciones recientes del usuario
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_AI_CONVERSATIONS_ID,
                queries
            );

            if (response.documents.length === 0) {
                return null;
            }

            // Obtener la conversación más reciente
            const latestDoc = response.documents.sort((a: any, b: any) => (b.lastActivity || 0) - (a.lastActivity || 0))[0];
            const data = latestDoc as any as AppwriteConversation;

            // Crear contexto desde los datos de Appwrite
            const context: ConversationContext = {
                messages: (data.messages || []).map(msg => ({
                    ...msg,
                    tokens: this.estimateTokens(msg.content)
                })),
                totalTokens: (data.messages || []).reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0),
                imageRequests: 0, // Resetear conteo de imágenes
                lastActivity: data.lastActivity || Date.now(),
                userId: data.userId,
                guildId: data.guildId,
                channelId: data.channelId,
                conversationId: data.conversationId
            };

            logger.debug(`Conversación cargada desde Appwrite: ${data.conversationId}`);
            return context;
        } catch (error) {
            logger.warn(`Error cargando conversación desde Appwrite: ${getErrorMessage(error)}`);
            return null;
        }
    }

    /**
     * Obtener jerarquía de roles de un servidor
     */
    private async getGuildRoleHierarchy(guildId: string, client: any): Promise<string> {
        try {
            const guild = await client.guilds.fetch(guildId);
            if (!guild) return '';

            const roles = await guild.roles.fetch();
            const sortedRoles = roles
                .filter((role: any) => role.id !== guild.id) // Excluir @everyone
                .sort((a: any, b: any) => b.position - a.position)
                .map((role: any) => {
                    const permissions = [];
                    if (role.permissions.has('Administrator')) permissions.push('Admin');
                    if (role.permissions.has('ManageGuild')) permissions.push('Manage Server');
                    if (role.permissions.has('ManageChannels')) permissions.push('Manage Channels');
                    if (role.permissions.has('ManageMessages')) permissions.push('Manage Messages');
                    if (role.permissions.has('ModerateMembers')) permissions.push('Moderate Members');

                    const permStr = permissions.length > 0 ? ` (${permissions.join(', ')})` : '';
                    return `- ${role.name}${permStr}`;
                })
                .slice(0, 15) // Limitar a 15 roles principales
                .join('\n');

            return sortedRoles ? `\n## Jerarquía de roles del servidor:\n${sortedRoles}\n` : '';
        } catch (error) {
            logger.warn(`Error obteniendo jerarquía de roles: ${getErrorMessage(error)}`);
            return '';
        }
    }

    /**
     * Generar imagen usando gemini-2.5-flash-image (Google Gen AI SDK moderno)
     * Retorna un objeto con los bytes de la imagen y el tipo MIME.
     */
    public async generateImage(prompt: string, options?: { size?: 'square' | 'portrait' | 'landscape'; mimeType?: string }): Promise<{ data: Buffer; mimeType: string; fileName: string; }> {
        if (!prompt?.trim()) {
            throw new Error('El prompt de imagen no puede estar vacío');
        }
        if (!this.genAIv2) {
            throw new Error('El SDK moderno (@google/genai) no está inicializado');
        }

        const mimeType = options?.mimeType ?? 'image/png';

        try {
            const res: any = await (this.genAIv2 as any).models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: prompt,
                prompt,
                config: {
                    responseMimeType: mimeType,
                    responseModalities: ['IMAGE'],
                }
            });

            // Normalize response shape
            const response = res?.response ?? res;
            const candidates = response?.candidates ?? [];
            const parts = candidates[0]?.content?.parts ?? [];
            let base64: string | undefined;
            let outMime: string | undefined;

            const imgPart = parts.find((p: any) => p?.inlineData?.data || p?.imageData?.data || p?.media?.data);
            if (imgPart?.inlineData?.data) {
                base64 = imgPart.inlineData.data;
                outMime = imgPart.inlineData.mimeType;
            } else if (imgPart?.imageData?.data) {
                base64 = imgPart.imageData.data;
                outMime = imgPart.imageData.mimeType;
            } else if (imgPart?.media?.data) {
                base64 = imgPart.media.data;
                outMime = imgPart.media.mimeType;
            }

            if (!base64) {
                // Try other top-level shapes
                if (res?.image?.data) {
                    base64 = res.image.data;
                    outMime = res.image.mimeType;
                } else if (Array.isArray(res?.images) && res.images.length > 0) {
                    const first = res.images[0];
                    base64 = first.data || first.b64Data || first.inlineData?.data;
                    outMime = first.mimeType || first.inlineData?.mimeType;
                } else if (response?.media?.data) {
                    base64 = response.media.data;
                    outMime = response.media.mimeType;
                }
            }

            if (!base64) {
                throw new Error('No se recibió imagen del modelo');
            }

            const finalMime = outMime || mimeType;
            let fileName = `gen_${Date.now()}.img`;
            if (finalMime.includes('png')) fileName = fileName.replace(/\.img$/, '.png');
            else if (finalMime.includes('jpeg') || finalMime.includes('jpg')) fileName = fileName.replace(/\.img$/, '.jpg');
            else if (finalMime.includes('webp')) fileName = fileName.replace(/\.img$/, '.webp');

            return { data: Buffer.from(base64, 'base64'), mimeType: finalMime, fileName };
        } catch (e) {
            const msg = this.parseAPIError(e);
            throw new Error(msg);
        }
    }
}

// Instancia singleton
export const aiService = new AIService();
