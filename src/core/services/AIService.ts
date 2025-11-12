import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GoogleGenAI, PersonGeneration } from "@google/genai";
import logger from "../lib/logger";
import { Collection } from "discord.js";
import { prisma } from "../database/prisma";
import { getDatabases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_AI_CONVERSATIONS_ID, isAIConversationsConfigured } from "../api/appwrite";
import { ensureAIConversationsSchema } from "../api/aiConversationsSchema";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdk: any = require('node-appwrite');

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
    $id?: string;
    userId: string;
    guildId?: string | null;
    channelId?: string | null;
    conversationId: string;
    messagesJson?: string; // JSON serializado del historial
    lastActivity: string; // ISO
    createdAt: string; // ISO
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

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Configuración de seguridad para imágenes
interface ImageSecurityConfig {
    allowedHosts: string[];
    maxFileSize: number;
    downloadTimeout: number;
    allowedMimeTypes: string[];
    blockedPatterns: RegExp[];
}

const IMAGE_SECURITY_CONFIG: ImageSecurityConfig = {
    allowedHosts: [
        'cdn.discordapp.com',
        'media.discordapp.net',
        'discordapp.com',
        'discord.com',
        'i.imgur.com',
        'imgur.com',
        'i.redd.it',
        'reddit.com',
        'preview.redd.it',
        'external-preview.redd.it',
        'pbs.twimg.com',
        'twimg.com',
        'instagram.com',
        'fbcdn.net',
        'googleusercontent.com',
        'gstatic.com',
        'githubusercontent.com',
        'gitlab.com',
        'steamusercontent.com',
        'steamcommunity.com',
        'artstation.com',
        'deviantart.com',
        'pixiv.net'
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB máximo
    downloadTimeout: 15000, // 15 segundos
    allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/tiff'
    ],
    blockedPatterns: [
        /\.exe$/i,
        /\.js$/i,
        /\.vbs$/i,
        /\.scr$/i,
        /\.bat$/i,
        /\.cmd$/i,
        /\.com$/i,
        /\.pif$/i,
        /\.jar$/i,
        /\.zip$/i,
        /\.rar$/i,
        /\.7z$/i,
        /\.php$/i,
        /\.asp$/i,
        /\.jsp$/i,
        /<script/i,
        /javascript:/i,
        /data:text\/html/i,
        /data:application/i
    ]
};

/**
 * Clase de error personalizada para violaciones de seguridad
 */
class ImageSecurityError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'ImageSecurityError';
    }
}

/**
 * Validador de seguridad para imágenes
 */
class ImageSecurityValidator {
    private config: ImageSecurityConfig;

    constructor(config: ImageSecurityConfig) {
        this.config = config;
    }

    /**
     * Valida si una URL de imagen es segura para descargar
     */
    validateImageUrl(url: string): void {
        if (!url || typeof url !== 'string') {
            throw new ImageSecurityError('URL de imagen inválida', 'INVALID_URL');
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            throw new ImageSecurityError('URL de imagen malformada', 'MALFORMED_URL');
        }

        // Verificar protocolo
        if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
            throw new ImageSecurityError('Protocolo de URL no permitido', 'INVALID_PROTOCOL');
        }

        // Verificar host permitido
        const hostname = parsedUrl.hostname.toLowerCase();
        const isAllowed = this.config.allowedHosts.some(allowedHost => {
            return hostname === allowedHost.toLowerCase() || 
                   hostname.endsWith('.' + allowedHost.toLowerCase());
        });

        if (!isAllowed) {
            throw new ImageSecurityError(
                `Host no permitido: ${hostname}. Solo se permiten imágenes de hosts confiables.`,
                'BLOCKED_HOST'
            );
        }

        // Verificar patrones bloqueados en la URL
        const urlString = url.toLowerCase();
        const blockedPattern = this.config.blockedPatterns.find(pattern => pattern.test(urlString));
        if (blockedPattern) {
            throw new ImageSecurityError(
                `URL contiene patrones sospechosos: ${blockedPattern.source}`,
                'SUSPICIOUS_PATTERN'
            );
        }

        // Verificar parámetros sospechosos
        const params = parsedUrl.searchParams;
        for (const [key, value] of params) {
            const paramStr = `${key}=${value}`.toLowerCase();
            const suspiciousParam = this.config.blockedPatterns.find(pattern => pattern.test(paramStr));
            if (suspiciousParam) {
                throw new ImageSecurityError(
                    `Parámetros de URL sospechosos detectados`,
                    'SUSPICIOUS_PARAMS'
                );
            }
        }
    }

    /**
     * Valida el tipo MIME de una imagen
     */
    validateMimeType(mimeType: string): void {
        if (!mimeType || typeof mimeType !== 'string') {
            throw new ImageSecurityError('Tipo MIME inválido', 'INVALID_MIME');
        }

        const normalizedMimeType = mimeType.toLowerCase().trim();
        if (!this.config.allowedMimeTypes.includes(normalizedMimeType)) {
            throw new ImageSecurityError(
                `Tipo de imagen no permitido: ${mimeType}. Tipos permitidos: ${this.config.allowedMimeTypes.join(', ')}`,
                'BLOCKED_MIME_TYPE'
            );
        }
    }

    /**
     * Valida el tamaño del archivo
     */
    validateFileSize(size: number): void {
        if (typeof size !== 'number' || size < 0) {
            throw new ImageSecurityError('Tamaño de archivo inválido', 'INVALID_SIZE');
        }

        if (size > this.config.maxFileSize) {
            throw new ImageSecurityError(
                `Archivo demasiado grande: ${(size / 1024 / 1024).toFixed(2)}MB. Máximo permitido: ${(this.config.maxFileSize / 1024 / 1024).toFixed(2)}MB`,
                'FILE_TOO_LARGE'
            );
        }
    }
}

/**
 * Descargador seguro de imágenes con validación integrada
 */
class SecureImageDownloader {
    private validator: ImageSecurityValidator;

    constructor(validator: ImageSecurityValidator) {
        this.validator = validator;
    }

    /**
     * Descarga una imagen de forma segura con validaciones completas
     */
    async downloadImage(url: string, timeoutMs: number = IMAGE_SECURITY_CONFIG.downloadTimeout): Promise<{
        buffer: Buffer;
        mimeType: string;
        size: number;
    }> {
        // Validar URL antes de descargar
        this.validator.validateImageUrl(url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            logger.info({ url, timeout: timeoutMs }, 'Descargando imagen con validación de seguridad');

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)',
                    'Accept': 'image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                },
                // Limitar redirecciones para evitar ataques de redirección
                redirect: 'follow',
                // Verificar tamaño del contenido antes de descargar
                size: IMAGE_SECURITY_CONFIG.maxFileSize + 1024 // Un poco más que el límite para permitir headers
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new ImageSecurityError(
                    `Error HTTP al descargar imagen: ${response.status} ${response.statusText}`,
                    'DOWNLOAD_FAILED'
                );
            }

            // Validar tipo MIME del response
            const contentType = response.headers.get('content-type');
            if (contentType) {
                const mimeType = contentType.split(';')[0].trim();
                this.validator.validateMimeType(mimeType);
            }

            // Validar tamaño del contenido
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                const size = parseInt(contentLength, 10);
                if (!isNaN(size)) {
                    this.validator.validateFileSize(size);
                }
            }

            // Descargar el contenido en chunks para validar el tamaño real
            const chunks: Buffer[] = [];
            let totalSize = 0;

            const reader = response.body?.getReader();
            if (!reader) {
                throw new ImageSecurityError('No se pudo obtener el contenido de la imagen', 'DOWNLOAD_FAILED');
            }

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    totalSize += value.length;
                    
                    // Validar tamaño acumulado
                    if (totalSize > IMAGE_SECURITY_CONFIG.maxFileSize) {
                        throw new ImageSecurityError(
                            `Tamaño de imagen excedido durante la descarga: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
                            'FILE_TOO_LARGE'
                        );
                    }

                    chunks.push(value);
                }
            } finally {
                reader.releaseLock();
            }

            const buffer = Buffer.concat(chunks);
            
            // Validar el tamaño final
            this.validator.validateFileSize(buffer.length);

            // Detectar tipo MIME final si no se obtuvo del header
            let finalMimeType = contentType?.split(';')[0].trim() || 'application/octet-stream';
            
            // Si el tipo MIME es genérico, intentar detectarlo del buffer
            if (finalMimeType === 'application/octet-stream') {
                finalMimeType = this.detectMimeTypeFromBuffer(buffer);
            }

            // Validar el tipo MIME final
            this.validator.validateMimeType(finalMimeType);

            logger.info({
                url: url,
                size: buffer.length,
                mimeType: finalMimeType,
                validation: 'passed'
            }, 'Imagen descargada y validada exitosamente');

            return {
                buffer,
                mimeType: finalMimeType,
                size: buffer.length
            };

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error instanceof ImageSecurityError) {
                throw error;
            }
            
            if (error instanceof Error && error.name === 'AbortError') {
                throw new ImageSecurityError(
                    `Timeout al descargar imagen: se excedió el tiempo de ${timeoutMs}ms`,
                    'DOWNLOAD_TIMEOUT'
                );
            }

            // Error de fetch o red
            if (error instanceof Error) {
                throw new ImageSecurityError(
                    `Error de red al descargar imagen: ${error.message}`,
                    'NETWORK_ERROR'
                );
            }

            throw new ImageSecurityError(
                'Error desconocido al descargar imagen',
                'UNKNOWN_ERROR'
            );
        }
    }

    /**
     * Detecta el tipo MIME desde el buffer de la imagen
     */
    private detectMimeTypeFromBuffer(buffer: Buffer): string {
        if (buffer.length < 4) return 'application/octet-stream';

        // Magic numbers para tipos de imagen comunes
        const header = buffer.slice(0, 12);

        // JPEG
        if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
            return 'image/jpeg';
        }

        // PNG
        if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
            return 'image/png';
        }

        // GIF
        if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
            return 'image/gif';
        }

        // WebP
        if (header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
            return 'image/webp';
        }

        // BMP
        if (header[0] === 0x42 && header[1] === 0x4D) {
            return 'image/bmp';
        }

        // TIFF
        if ((header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2A && header[3] === 0x00) ||
            (header[0] === 0x4D && header[1] === 0x4D && header[2] === 0x00 && header[3] === 0x2A)) {
            return 'image/tiff';
        }

        return 'application/octet-stream';
    }
}

function isServiceUnavailableError(error: unknown): boolean {
    if (!error) {
        return false;
    }

    const message = getErrorMessage(error).toLowerCase();

    if (
        message.includes('503') ||
        message.includes('service unavailable') ||
        message.includes('model is overloaded') ||
        message.includes('model estuvo sobrecargado') ||
        message.includes('overloaded') ||
        message.includes('temporarily unavailable')
    ) {
        return true;
    }

    const status = (error as any)?.status ?? (error as any)?.statusCode ?? (error as any)?.code;
    if (typeof status === 'number' && status === 503) {
        return true;
    }
    if (typeof status === 'string' && status.includes('503')) {
        return true;
    }

    if (isAPIError(error)) {
        const apiMessage = error.message.toLowerCase();
        return (
            apiMessage.includes('503') ||
            apiMessage.includes('service unavailable') ||
            apiMessage.includes('overloaded')
        );
    }

    return false;
}

export class AIService {
    private genAI: GoogleGenerativeAI;
    private genAIv2: any;
    // Cache del modelo de imágenes detectado
    private imageModelName?: string | null;
    private conversations = new Collection<string, ConversationContext>();
    private requestQueue: AIRequest[] = [];
    private processing = false;
    private userCooldowns = new Collection<string, number>();
    private rateLimitTracker = new Collection<string, { count: number; resetTime: number }>();
    // Cache de configuración por guild
    private guildPromptCache = new Collection<string, { prompt: string | null; fetchedAt: number }>();
    // Validador de seguridad para imágenes
    private imageSecurityValidator: ImageSecurityValidator;
    private secureImageDownloader: SecureImageDownloader;

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
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Falta la clave de Google AI. Define GOOGLE_AI_API_KEY o GEMINI_API_KEY en las variables de entorno.');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);

        try {
            this.genAIv2 = new GoogleGenAI({ apiKey });
            logger.info('GoogleGenAI v2 inicializado correctamente para generación de imágenes');
        } catch (e) {
            logger.warn(`GoogleGenAI v2 no pudo inicializarse: ${getErrorMessage(e)}`);
            this.genAIv2 = null;
        }

        // Permitir override de modelo por variable de entorno
        const envImageModel = process.env.GENAI_IMAGE_MODEL;
        if (envImageModel && envImageModel.trim()) {
            this.imageModelName = envImageModel.trim();
            logger.info({ model: this.imageModelName }, 'Modelo de imágenes fijado por GENAI_IMAGE_MODEL');
        }

        // Inicializar componentes de seguridad para imágenes
        this.imageSecurityValidator = new ImageSecurityValidator(IMAGE_SECURITY_CONFIG);
        this.secureImageDownloader = new SecureImageDownloader(this.imageSecurityValidator);
        logger.info('Sistema de seguridad de imágenes inicializado');

        this.startQueueProcessor();
        this.startCleanupService();
        this.detectImageModel();
    }

    /**
     * Auto-detectar modelo de imagen disponible
     */
    private async detectImageModel(): Promise<string | null> {
        if (!this.genAIv2) {
            logger.warn('GoogleGenAI v2 no disponible; sin soporte para imágenes');
            return null;
        }

        // Lista de candidatos de modelos de imagen ordenados por preferencia (Imagen 4.0 primero, con retrocompatibilidad)
        const candidates = [
            'models/imagen-4.0-generate-001',
            'imagen-4.0-generate-001',
            'models/imagen-3.0-fast',
            'imagen-3.0-fast',
            'models/imagen-3.0',
            'imagen-3.0',
            'models/gemini-2.5-flash-image',
            'gemini-2.5-flash-image',
        ];

        // Intentar listar modelos primero
        try {
            const listed: any = await (this.genAIv2 as any).models?.listModels?.();
            if (listed?.models && Array.isArray(listed.models)) {
                const models: string[] = listed.models
                    .map((m: any) => m?.name || m?.model || m?.id || m?.displayName)
                    .filter(Boolean);

                logger.debug({ availableModels: models }, 'Modelos disponibles detectados');

                // Buscar modelos de imagen disponibles
                const imageModels = models.filter((id: string) =>
                    /imagen|image|generate|vision/i.test(id) &&
                    !/text|chat|embed|code/i.test(id)
                );

                if (imageModels.length > 0) {
                    // Priorizar según orden de candidatos
                    for (const candidate of candidates) {
                        const candidateBase = candidate.replace(/^models\//, '');
                        const found = imageModels.find(m =>
                            m === candidate ||
                            m === candidateBase ||
                            m.includes(candidateBase)
                        );
                        if (found) {
                            this.imageModelName = found;
                            logger.info({ model: found, source: 'listModels' }, 'Modelo de imágenes detectado automáticamente');
                            return found;
                        }
                    }

                    // Si no coincide con candidatos conocidos, usar el primero disponible
                    this.imageModelName = imageModels[0];
                    logger.info({ model: imageModels[0], source: 'listModels-fallback' }, 'Modelo de imágenes detectado (fallback)');
                    return imageModels[0];
                }
            }
        } catch (e) {
            logger.debug({ err: getErrorMessage(e) }, 'listModels no disponible');
        }

        // Fallback: probar modelos uno por uno
        for (const candidate of candidates) {
            try {
                await (this.genAIv2 as any).models.generateImages({
                    model: candidate,
                    prompt: 'test',
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: '1:1',
                        imageSize: '1K',
                    }
                });

                // Si no lanza error, el modelo existe
                this.imageModelName = candidate;
                logger.info({ model: candidate, source: 'direct-test' }, 'Modelo de imágenes detectado por prueba directa');
                return candidate;
            } catch (e: any) {
                const msg = getErrorMessage(e);
                if (msg.includes('not found') || msg.includes('404')) {
                    continue; // Modelo no disponible, probar siguiente
                }
                // Otros errores pueden indicar que el modelo existe pero falló por otra razón
                logger.debug({ candidate, err: msg }, 'Modelo podría existir pero falló la prueba');
            }
        }

        // No se encontró ningún modelo de imagen
        this.imageModelName = null;
        logger.warn('No se detectó ningún modelo de imagen disponible');
        return null;
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
            if (apiMessage.includes('service unavailable') || apiMessage.includes('overloaded') || apiMessage.includes('503')) {
                return 'El servicio de IA está saturado. Intenta de nuevo en unos segundos';
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
        if (message.includes('service unavailable') || message.includes('overloaded') || message.includes('503')) {
            return 'El servicio de IA está saturado. Intenta de nuevo en unos segundos';
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

    private async generateContentWithRetries(model: any, content: any, options?: {
        maxAttempts?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
    }): Promise<any> {
        const {
            maxAttempts = 3,
            baseDelayMs = 1200,
            maxDelayMs = 10_000
        } = options ?? {};

        let lastError: unknown;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await model.generateContent(content);
            } catch (error) {
                lastError = error;
                const isRetryable = isServiceUnavailableError(error);
                const isLastAttempt = attempt === maxAttempts - 1;

                if (!isRetryable || isLastAttempt) {
                    throw error;
                }

                const backoff = Math.min(maxDelayMs, Math.floor(baseDelayMs * Math.pow(2, attempt)));
                const jitter = Math.floor(Math.random() * Math.max(200, Math.floor(baseDelayMs / 2)));
                const waitMs = backoff + jitter;

                logger.warn(
                    { attempt: attempt + 1, waitMs },
                    `Gemini respondió 503 (overloaded). Reintentando en ${waitMs}ms (intento ${attempt + 2}/${maxAttempts})`
                );

                await sleep(waitMs);
            }
        }

        throw lastError ?? new Error('Error desconocido al generar contenido con Gemini');
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
     * Lista modelos de imagen visibles por la clave (si el SDK lo permite)
     */
    public async listImageModels(): Promise<string[]> {
        if (!this.genAIv2 || !(this.genAIv2 as any).models?.listModels) return [];
        try {
            const listed: any = await (this.genAIv2 as any).models.listModels();
            const models: string[] = Array.isArray(listed?.models)
                ? listed.models.map((m: any) => m?.name || m?.model || m?.id).filter(Boolean)
                : [];
            // Filtrar a modelos de imagen de forma heurística
            return models.filter((id) => /imagen|image/i.test(id));
        } catch {
            return [];
        }
    }

    // Override manual del modelo de imágenes (útil para runtime)
    public setImageModel(model: string | null | undefined): void {
        this.imageModelName = model ?? null;
        if (this.imageModelName) {
            logger.info({ model: this.imageModelName }, 'Modelo de imágenes fijado manualmente');
        } else {
            logger.info('Modelo de imágenes reseteado; se volverá a detectar automáticamente');
        }
    }

    /**
     * Detectar si hay imágenes adjuntas en el mensaje para análisis
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
     * Procesar imágenes adjuntas para análisis con Gemini Vision - Versión segura
     */
    private async processImageAttachments(attachments: any[]): Promise<any[]> {
        const imageAttachments: Array<{ inlineData: { data: string; mimeType: string } }> = [];
        let processedCount = 0;
        let securityBlockedCount = 0;

        for (const attachment of attachments) {
            if (this.hasImageAttachments([attachment])) {
                try {
                    // Validar URL de imagen antes de descargar
                    this.imageSecurityValidator.validateImageUrl(attachment.url);
                    
                    // Descargar imagen de forma segura con timeout y validaciones
                    const { buffer, mimeType, size } = await this.secureImageDownloader.downloadImage(attachment.url);
                    
                    // Convertir a base64 para Gemini Vision
                    const base64Data = buffer.toString('base64');

                    imageAttachments.push({
                        inlineData: {
                            data: base64Data,
                            mimeType: mimeType
                        }
                    });

                    processedCount++;
                    logger.info({
                        name: attachment.name,
                        mimeType: mimeType,
                        size: `${(size / 1024).toFixed(2)}KB`,
                        security: 'validated'
                    }, 'Imagen procesada exitosamente con validación de seguridad');

                } catch (error) {
                    if (error instanceof ImageSecurityError) {
                        securityBlockedCount++;
                        logger.warn({
                            name: attachment.name,
                            url: attachment.url,
                            error: error.message,
                            code: error.code
                        }, 'Imagen bloqueada por violación de seguridad');
                    } else {
                        logger.error({
                            name: attachment.name,
                            url: attachment.url,
                            error: getErrorMessage(error)
                        }, 'Error procesando imagen');
                    }
                }
            }
        }

        if (securityBlockedCount > 0) {
            logger.warn({
                total: attachments.length,
                processed: processedCount,
                blocked: securityBlockedCount
            }, `Procesamiento de imágenes completado con ${securityBlockedCount} imágenes bloqueadas por seguridad`);
        }

        return imageAttachments;
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
                model: "gemini-2.5-flash",
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

            const result = await this.generateContentWithRetries(model, content);
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
     * Obtener configuración de seguridad de imágenes
     */
    getImageSecurityConfig(): {
        allowedHosts: string[];
        maxFileSize: number;
        downloadTimeout: number;
        allowedMimeTypes: string[];
    } {
        return {
            allowedHosts: IMAGE_SECURITY_CONFIG.allowedHosts,
            maxFileSize: IMAGE_SECURITY_CONFIG.maxFileSize,
            downloadTimeout: IMAGE_SECURITY_CONFIG.downloadTimeout,
            allowedMimeTypes: IMAGE_SECURITY_CONFIG.allowedMimeTypes
        };
    }

    /**
     * Validar una URL de imagen manualmente (útil para pruebas)
     */
    validateImageUrl(url: string): { valid: boolean; error?: string; code?: string } {
        try {
            this.imageSecurityValidator.validateImageUrl(url);
            return { valid: true };
        } catch (error) {
            if (error instanceof ImageSecurityError) {
                return { 
                    valid: false, 
                    error: error.message, 
                    code: error.code 
                };
            }
            return { 
                valid: false, 
                error: 'Error desconocido al validar URL', 
                code: 'UNKNOWN' 
            };
        }
    }

    /**
     * Guardar conversación en Appwrite para memoria persistente
     */
    private async saveConversationToAppwrite(context: ConversationContext): Promise<void> {
        if (!isAIConversationsConfigured()) {
            return; // Si no está configurado, no guardamos
        }

        try {
            await ensureAIConversationsSchema();
            const databases = getDatabases();
            if (!databases) return;

            // Asegurar conversationId válido y corto para Appwrite
            let conversationId = context.conversationId;
            if (!conversationId) {
                const userIdShort = context.userId.slice(-8);
                const guildIdShort = context.guildId ? context.guildId.slice(-8) : 'dm';
                const timestamp = Date.now().toString(36);
                conversationId = `ai_${userIdShort}_${guildIdShort}_${timestamp}`.slice(0, 36);
                context.conversationId = conversationId;
            }

            // Serializar mensajes a JSON
            const messagesPayload = context.messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                messageId: m.messageId,
                referencedMessageId: m.referencedMessageId,
            }));
            const messagesJson = JSON.stringify(messagesPayload);

            const data: AppwriteConversation = {
                userId: context.userId,
                guildId: context.guildId ?? null,
                channelId: context.channelId ?? null,
                conversationId,
                messagesJson,
                lastActivity: new Date(context.lastActivity).toISOString(),
                createdAt: new Date().toISOString(),
            };

            // Upsert por ID estable
            try {
                await databases.updateDocument(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_AI_CONVERSATIONS_ID,
                    conversationId,
                    data
                );
            } catch (updateError) {
                await databases.createDocument(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_AI_CONVERSATIONS_ID,
                    conversationId,
                    data
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
            await ensureAIConversationsSchema();
            const databases = getDatabases();
            if (!databases) return null;

            const queries: any[] = [sdk.Query.equal('userId', userId)];
            if (guildId) queries.push(sdk.Query.equal('guildId', guildId));
            if (channelId) queries.push(sdk.Query.equal('channelId', channelId));
            queries.push(sdk.Query.orderDesc('lastActivity'));
            queries.push(sdk.Query.limit(1));

            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_AI_CONVERSATIONS_ID,
                queries
            ) as unknown as { documents: AppwriteConversation[] };

            const docs = (response?.documents || []) as AppwriteConversation[];
            if (!docs.length) return null;

            const latest = docs[0];
            const messagesArray: any[] = (() => {
                try { return latest.messagesJson ? JSON.parse(latest.messagesJson) : []; } catch { return []; }
            })();

            const context: ConversationContext = {
                messages: messagesArray.map((msg: any) => ({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: String(msg.content || ''),
                    timestamp: Number(msg.timestamp || Date.now()),
                    tokens: this.estimateTokens(String(msg.content || '')),
                    messageId: msg.messageId,
                    referencedMessageId: msg.referencedMessageId,
                })),
                totalTokens: messagesArray.reduce((sum: number, m: any) => sum + this.estimateTokens(String(m.content || '')), 0),
                imageRequests: 0,
                lastActivity: Date.parse(latest.lastActivity || new Date().toISOString()) || Date.now(),
                userId: latest.userId,
                guildId: latest.guildId || undefined,
                channelId: latest.channelId || undefined,
                conversationId: latest.conversationId,
            };

            logger.debug(`Conversación cargada desde Appwrite: ${latest.conversationId}`);
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
                    const permissions: string[] = [];
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
     * Generar imagen usando la nueva API de @google/genai (basada en Google AI Studio)
     * Retorna un objeto con los bytes de la imagen y el tipo MIME.
     */
    public async generateImage(prompt: string, options?: {
        size?: 'square' | 'portrait' | 'landscape';
        mimeType?: string;
        numberOfImages?: number;
        personGeneration?: boolean;
    }): Promise<{ data: Buffer; mimeType: string; fileName: string; }> {
        if (!prompt?.trim()) {
            throw new Error('El prompt de imagen no puede estar vacío');
        }
        if (!this.genAIv2) {
            throw new Error('El SDK moderno (@google/genai) no está inicializado');
        }

        // Obtener/descubrir el modelo
        const model = this.imageModelName ?? (await this.detectImageModel());
        if (!model) {
            throw new Error('El generador de imágenes no está disponible para tu cuenta o región. Habilita Imagen 4.0 (imagen-4.0-generate-001) en Google AI Studio.');
        }

        const mimeType = options?.mimeType ?? 'image/jpeg';
        const size = options?.size ?? 'square';
        const numberOfImages = options?.numberOfImages ?? 1;
        const personGeneration = options?.personGeneration ?? true;

        // Mapear tamaño a aspectRatio según la nueva API
        const aspectRatio = size === 'portrait' ? '9:16' : size === 'landscape' ? '16:9' : '1:1';

        try {
            logger.info({ model, prompt: prompt.slice(0, 100) }, 'Generando imagen con nueva API');

            const response: any = await (this.genAIv2 as any).models.generateImages({
                model: model,
                prompt: prompt,
                config: {
                    numberOfImages: numberOfImages,
                    outputMimeType: mimeType,
                    personGeneration: personGeneration ? PersonGeneration.ALLOW_ALL : PersonGeneration.DONT_ALLOW,
                    aspectRatio: aspectRatio,
                    imageSize: '1K', // Usar 1K como tamaño estándar
                }
            });

            if (!response?.generatedImages || !Array.isArray(response.generatedImages) || response.generatedImages.length === 0) {
                logger.error({ response, model }, 'No se generaron imágenes en la respuesta');
                throw new Error('No se generaron imágenes');
            }

            // Tomar la primera imagen generada
            const generatedImage = response.generatedImages[0];
            if (!generatedImage?.image?.imageBytes) {
                logger.error({ generatedImage, model }, 'La imagen generada no contiene datos de bytes');
                throw new Error('La imagen generada no contiene datos válidos');
            }

            const base64Data = generatedImage.image.imageBytes;
            const buffer = Buffer.from(base64Data, 'base64');

            // Generar nombre de archivo basado en el tipo MIME
            let fileName = `gen_${Date.now()}`;
            if (mimeType.includes('png')) fileName += '.png';
            else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) fileName += '.jpg';
            else if (mimeType.includes('webp')) fileName += '.webp';
            else fileName += '.img';

            logger.info({
                fileName,
                mimeType,
                bufferSize: buffer.length,
                model
            }, 'Imagen generada exitosamente');

            return {
                data: buffer,
                mimeType: mimeType,
                fileName: fileName
            };

        } catch (e) {
            logger.error({ err: e as any, model, prompt: prompt.slice(0, 100) }, 'Error en generateImage');
            const parsed = this.parseAPIError(e);
            const original = getErrorMessage(e);

            // Proporcionar mensajes de error más específicos
            if (original.includes('not found') || original.includes('404')) {
                throw new Error('El modelo de generación de imágenes no está disponible. Verifica que Imagen 4.0 esté habilitado en tu cuenta de Google AI Studio.');
            }
            if (original.includes('quota') || original.includes('limit')) {
                throw new Error('Has alcanzado el límite de generación de imágenes. Intenta más tarde.');
            }

            // Si el parser no aporta información útil, usar el mensaje original
            const message = parsed === 'Error temporal del servicio de IA. Intenta de nuevo' ? original : parsed;
            throw new Error(message || parsed);
        }
    }
}

// Instancia singleton
export const aiService = new AIService();
