<template>
  <div class="editor-container">
    <div class="editor-header">
      <div class="header-left">
        <span class="file-icon">{{ getFileIcon() }}</span>
        <span class="file-path">{{ fileInfo?.name || 'Sin archivo seleccionado' }}</span>
        <span v-if="hasChanges" class="unsaved-indicator">●</span>
      </div>
      <div class="header-right">
        <button @click="saveFile" :disabled="!hasChanges" class="save-btn">
          💾 Guardar
        </button>
      </div>
    </div>
    <div class="editor-content" ref="editorContainer"></div>
    
    <!-- Widget de acciones de IA -->
    <Transition name="fade">
      <div v-if="showAIActions" class="ai-actions-widget" :style="aiWidgetPosition">
        <button @click="handleAIAction('fix')" class="ai-action-btn fix-btn" title="Corregir código">
          🔧 Fix
        </button>
        <button @click="handleAIAction('explain')" class="ai-action-btn explain-btn" title="Explicar código">
          💡 Explain
        </button>
        <button @click="handleAIAction('refactor')" class="ai-action-btn refactor-btn" title="Refactorizar código">
          ♻️ Refactor
        </button>
        <button @click="handleAIAction('optimize')" class="ai-action-btn optimize-btn" title="Optimizar código">
          ⚡ Optimize
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as monaco from 'monaco-editor';
import { invoke } from '@tauri-apps/api/core';
import type { FileInfo } from '../types/bot';

const props = defineProps<{
  fileInfo: FileInfo | null;
  content: string;
}>();

const emit = defineEmits<{
  'save': [content: string];
  'change': [content: string];
}>();

const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
const hasChanges = ref(false);
const showAIActions = ref(false);
const aiWidgetPosition = ref({ top: '0px', left: '0px' });
const selectedText = ref('');

function getFileIcon(): string {
  if (!props.fileInfo) return '📄';
  if (props.fileInfo.type === 'command') {
    return props.fileInfo.commandType === 'slash' ? '⚡' : '📝';
  }
  return props.fileInfo.eventType === 'extra' ? '✨' : '🎯';
}

async function handleAIAction(action: 'fix' | 'explain' | 'refactor' | 'optimize') {
  console.log('🎯 Acción de IA:', action);
  
  if (!editor || !selectedText.value) {
    console.log('⚠️ No hay editor o texto seleccionado');
    return;
  }
  
  const apiKey = localStorage.getItem('gemini_api_key');
  const model = localStorage.getItem('gemini_model') || 'gemini-2.5-flash';
  
  if (!apiKey) {
    alert('⚠️ Configura tu API key de Gemini primero en la sección "✨ Gemini IA"');
    return;
  }

  const selection = editor.getSelection();
  if (!selection) {
    console.log('⚠️ No hay selección válida');
    return;
  }

  console.log('📝 Texto seleccionado:', selectedText.value.substring(0, 50) + '...');

  const prompts = {
    fix: `Fix any errors or bugs in this code. Return ONLY the corrected code, no explanations:\n\n${selectedText.value}`,
    explain: `Explain what this code does in Spanish. Be concise and clear:\n\n${selectedText.value}`,
    refactor: `Refactor this code to make it cleaner and more maintainable. Return ONLY the refactored code:\n\n${selectedText.value}`,
    optimize: `Optimize this code for better performance. Return ONLY the optimized code:\n\n${selectedText.value}`
  };

  try {
    showAIActions.value = false;
    console.log('🚀 Llamando a Gemini con ask_gemini...');
    console.log('📝 Prompt:', prompts[action].substring(0, 100) + '...');
    
    const result = await invoke<string>('ask_gemini', {
      prompt: prompts[action],
      apiKey,
      model,
      useThinking: true // Usar thinking para mejores resultados
    });

    console.log('✅ Respuesta recibida:', result.substring(0, 100) + '...');

    if (result && result.length > 0) {
      if (action === 'explain') {
        // Mostrar explicación en un mensaje
        alert(`💡 Explicación:\n\n${result}`);
      } else {
        // Reemplazar código seleccionado
        const edit = {
          range: selection,
          text: result
        };
        editor.executeEdits('ai-action', [edit]);
        hasChanges.value = true;
        console.log('✅ Código reemplazado');
      }
    } else {
      console.log('⚠️ No se recibió respuesta');
      alert('⚠️ No se pudo obtener una respuesta de Gemini. Intenta de nuevo.');
    }
  } catch (error) {
    console.error('❌ Error en acción de IA:', error);
    alert(`❌ Error: ${error}`);
  }
}

function getLanguageFromFile(): string {
  const ext = props.fileInfo?.path?.split('.').pop() || 'txt';
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'js': 'javascript',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'rs': 'rust',
    'go': 'go',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'html': 'html',
    'css': 'css',
    'vue': 'vue'
  };
  return langMap[ext] || 'text';
}

function saveFile() {
  if (editor && hasChanges.value) {
    const content = editor.getValue();
    emit('save', content);
    hasChanges.value = false;
  }
}

onMounted(() => {
  if (editorContainer.value) {
    // Configurar tema personalizado estilo VS Code Dark+
    monaco.editor.defineTheme('vs-dark-custom', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'class', foreground: '4EC9B0' },
        { token: 'interface', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'constant', foreground: '4FC1FF' },
        { token: 'property', foreground: '9CDCFE' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'D4D4D4' },
        { token: 'tag', foreground: '569CD6' },
        { token: 'attribute.name', foreground: '9CDCFE' },
        { token: 'attribute.value', foreground: 'CE9178' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2A2A2A',
        'editor.lineHighlightBorder': '#00000000',
        'editor.selectionBackground': '#264F78',
        'editor.selectionHighlightBackground': '#ADD6FF26',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editor.wordHighlightBackground': '#575757B8',
        'editor.wordHighlightStrongBackground': '#004972B8',
        'editor.findMatchBackground': '#515C6A',
        'editor.findMatchHighlightBackground': '#EA5C0055',
        'editor.findRangeHighlightBackground': '#3A3D4166',
        'editor.hoverHighlightBackground': '#264f7840',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888',
        'editorCursor.foreground': '#AEAFAD',
        'editorWhitespace.foreground': '#404040',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#C6C6C6',
        'editorRuler.foreground': '#5A5A5A',
        'editorCodeLens.foreground': '#999999',
        'editorInlayHint.foreground': '#969696',
        'editorInlayHint.background': '#4d4d4d26',
        'editorError.foreground': '#F48771',
        'editorWarning.foreground': '#CCA700',
        'editorInfo.foreground': '#75BEFF',
        'editorHint.foreground': '#EEEEEE6B',
        'editorGutter.background': '#1E1E1E',
        'editorGutter.modifiedBackground': '#1B81A8',
        'editorGutter.addedBackground': '#487E02',
        'editorGutter.deletedBackground': '#F48771',
        'diffEditor.insertedTextBackground': '#9BB95533',
        'diffEditor.removedTextBackground': '#FF000033',
        'editorWidget.background': '#252526',
        'editorWidget.border': '#454545',
        'editorSuggestWidget.background': '#252526',
        'editorSuggestWidget.border': '#454545',
        'editorSuggestWidget.foreground': '#D4D4D4',
        'editorSuggestWidget.selectedBackground': '#062F4A',
        'editorSuggestWidget.highlightForeground': '#0097FB',
        'editorHoverWidget.background': '#252526',
        'editorHoverWidget.border': '#454545',
        'peekView.border': '#007ACC',
        'peekViewEditor.background': '#001F33',
        'peekViewResult.background': '#252526',
        'peekViewTitle.background': '#1E1E1E',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464B3',
        'scrollbarSlider.activeBackground': '#BFBFBF66',
        'minimap.background': '#1E1E1E',
        'minimap.selectionHighlight': '#264F78',
        'minimap.errorHighlight': '#F48771',
        'minimap.warningHighlight': '#CCA700',
        'minimapGutter.addedBackground': '#487E02',
        'minimapGutter.modifiedBackground': '#1B81A8',
        'minimapGutter.deletedBackground': '#F48771',
      }
    });

    // Configurar TypeScript con todas las características del playground
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      lib: ['ES2020', 'DOM'], // Importante: incluir librerías ES2020 y DOM
      
      // Opciones adicionales para mejor experiencia
      strict: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictBindCallApply: true,
      strictPropertyInitialization: true,
      noImplicitAny: true,
      noImplicitThis: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      alwaysStrict: true,
      skipLibCheck: false,
      allowSyntheticDefaultImports: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      isolatedModules: true,
    });

    // Configuración de diagnósticos (errores y warnings estilo ESLint)
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
      diagnosticCodesToIgnore: [],
    });

    // Configuración similar para JavaScript
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      lib: ['ES2020', 'DOM'],
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
      noImplicitAny: false,
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
      diagnosticCodesToIgnore: [],
    });

    // Configuración similar para JavaScript
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      lib: ['ES2020', 'DOM'],
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: true,
      noImplicitAny: false,
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
      diagnosticCodesToIgnore: [],
    });

    // Configurar opciones de IntelliSense más agresivas
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    
    // Cargar librerías nativas de JavaScript desde CDN
    const loadNativeLibs = async () => {
      try {
        // Cargar lib.es2020.d.ts desde CDN de TypeScript
        const libs = [
          'https://cdn.jsdelivr.net/npm/typescript@5.3.3/lib/lib.es2020.full.d.ts',
        ];
        
        for (const libUrl of libs) {
          try {
            const response = await fetch(libUrl);
            const content = await response.text();
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
              content,
              `file:///node_modules/@types/lib.d.ts`
            );
            console.log('✅ Librerías nativas de JS cargadas');
          } catch (err) {
            console.warn('⚠️ No se pudo cargar librería desde CDN:', err);
          }
        }
      } catch (error) {
        console.warn('Error cargando librerías nativas:', error);
      }
    };
    
    // Cargar libs de forma asíncrona
    loadNativeLibs();
    
    // Agregar declaraciones básicas mientras se cargan las completas
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      // Librerías nativas de JavaScript básicas
      declare const Math: {
        E: number;
        LN10: number;
        LN2: number;
        LOG10E: number;
        LOG2E: number;
        PI: number;
        SQRT1_2: number;
        SQRT2: number;
        abs(x: number): number;
        acos(x: number): number;
        asin(x: number): number;
        atan(x: number): number;
        atan2(y: number, x: number): number;
        ceil(x: number): number;
        cos(x: number): number;
        exp(x: number): number;
        floor(x: number): number;
        log(x: number): number;
        max(...values: number[]): number;
        min(...values: number[]): number;
        pow(x: number, y: number): number;
        random(): number;
        round(x: number): number;
        sin(x: number): number;
        sqrt(x: number): number;
        tan(x: number): number;
      };
      
      declare const JSON: {
        parse(text: string, reviver?: (key: any, value: any) => any): any;
        stringify(value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
        stringify(value: any, replacer?: (number | string)[] | null, space?: string | number): string;
      };
      
      declare const console: {
        log(...data: any[]): void;
        error(...data: any[]): void;
        warn(...data: any[]): void;
        info(...data: any[]): void;
        debug(...data: any[]): void;
        table(data: any): void;
        time(label?: string): void;
        timeEnd(label?: string): void;
        trace(...data: any[]): void;
        clear(): void;
      };
      
      interface Array<T> {
        length: number;
        push(...items: T[]): number;
        pop(): T | undefined;
        shift(): T | undefined;
        unshift(...items: T[]): number;
        concat(...items: (T | T[])[]): T[];
        join(separator?: string): string;
        reverse(): T[];
        slice(start?: number, end?: number): T[];
        sort(compareFn?: (a: T, b: T) => number): this;
        splice(start: number, deleteCount?: number, ...items: T[]): T[];
        indexOf(searchElement: T, fromIndex?: number): number;
        lastIndexOf(searchElement: T, fromIndex?: number): number;
        every(predicate: (value: T, index: number, array: T[]) => boolean): boolean;
        some(predicate: (value: T, index: number, array: T[]) => boolean): boolean;
        forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
        map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
        filter(predicate: (value: T, index: number, array: T[]) => boolean): T[];
        reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
        find(predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined;
        findIndex(predicate: (value: T, index: number, obj: T[]) => boolean): number;
        includes(searchElement: T, fromIndex?: number): boolean;
      }
      
      interface ArrayConstructor {
        isArray(arg: any): arg is any[];
        from<T>(arrayLike: ArrayLike<T>): T[];
        of<T>(...items: T[]): T[];
      }
      
      declare const Array: ArrayConstructor;
      
      interface String {
        length: number;
        charAt(pos: number): string;
        charCodeAt(index: number): number;
        concat(...strings: string[]): string;
        indexOf(searchString: string, position?: number): number;
        lastIndexOf(searchString: string, position?: number): number;
        match(regexp: string | RegExp): RegExpMatchArray | null;
        replace(searchValue: string | RegExp, replaceValue: string): string;
        search(regexp: string | RegExp): number;
        slice(start?: number, end?: number): string;
        split(separator: string | RegExp, limit?: number): string[];
        substring(start: number, end?: number): string;
        toLowerCase(): string;
        toUpperCase(): string;
        trim(): string;
        startsWith(searchString: string, position?: number): boolean;
        endsWith(searchString: string, endPosition?: number): boolean;
        includes(searchString: string, position?: number): boolean;
        repeat(count: number): number;
        padStart(maxLength: number, fillString?: string): string;
        padEnd(maxLength: number, fillString?: string): string;
      }
      
      interface Number {
        toString(radix?: number): string;
        toFixed(fractionDigits?: number): string;
        toExponential(fractionDigits?: number): string;
        toPrecision(precision?: number): string;
      }
      
      interface NumberConstructor {
        readonly MAX_VALUE: number;
        readonly MIN_VALUE: number;
        readonly NaN: number;
        readonly NEGATIVE_INFINITY: number;
        readonly POSITIVE_INFINITY: number;
        parseFloat(string: string): number;
        parseInt(string: string, radix?: number): number;
        isNaN(number: number): boolean;
        isFinite(number: number): boolean;
        isInteger(number: number): boolean;
      }
      
      declare const Number: NumberConstructor;
      
      interface Object {
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
      }
      
      interface ObjectConstructor {
        new(value?: any): Object;
        (value?: any): any;
        readonly prototype: Object;
        keys(o: object): string[];
        values(o: object): any[];
        entries(o: object): [string, any][];
        assign<T, U>(target: T, source: U): T & U;
        freeze<T>(o: T): Readonly<T>;
        seal<T>(o: T): T;
        create(o: object | null): any;
        defineProperty(o: any, p: PropertyKey, attributes: PropertyDescriptor): any;
      }
      
      declare const Object: ObjectConstructor;
      
      interface Date {
        toString(): string;
        toDateString(): string;
        toTimeString(): string;
        toLocaleString(): string;
        toLocaleDateString(): string;
        toLocaleTimeString(): string;
        valueOf(): number;
        getTime(): number;
        getFullYear(): number;
        getMonth(): number;
        getDate(): number;
        getDay(): number;
        getHours(): number;
        getMinutes(): number;
        getSeconds(): number;
        getMilliseconds(): number;
      }
      
      interface DateConstructor {
        new(): Date;
        new(value: number | string): Date;
        now(): number;
        parse(s: string): number;
      }
      
      declare const Date: DateConstructor;
      
      interface Promise<T> {
        then<TResult1 = T, TResult2 = never>(
          onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
        ): Promise<TResult1 | TResult2>;
        catch<TResult = never>(
          onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
        ): Promise<T | TResult>;
        finally(onfinally?: (() => void) | null): Promise<T>;
      }
      
      interface PromiseConstructor {
        new <T>(executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void): Promise<T>;
        all<T>(values: (T | PromiseLike<T>)[]): Promise<T[]>;
        race<T>(values: (T | PromiseLike<T>)[]): Promise<T>;
        resolve<T>(value: T | PromiseLike<T>): Promise<T>;
        reject<T = never>(reason?: any): Promise<T>;
      }
      
      declare const Promise: PromiseConstructor;
      
      declare function setTimeout(handler: () => void, timeout?: number): number;
      declare function setInterval(handler: () => void, timeout?: number): number;
      declare function clearTimeout(handle: number): void;
      declare function clearInterval(handle: number): void;
    `, 'ts:lib.basic.d.ts');
    
    editor = monaco.editor.create(editorContainer.value, {
      value: props.content,
      language: 'typescript',
      theme: 'vs-dark-custom',
      automaticLayout: true,
      
      // Minimap estilo VS Code
      minimap: { 
        enabled: true,
        side: 'right',
        renderCharacters: true,
        maxColumn: 120,
        scale: 1,
        showSlider: 'mouseover'
      },
      
      // Tipografía y espaciado
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', 'Courier New', monospace",
      fontLigatures: true,
      lineHeight: 21,
      letterSpacing: 0,
      
      // Números de línea estilo VS Code
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      
      // Guías y espaciado visual
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
      renderControlCharacters: true,
      
      // Scrolling suave
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      cursorBlinking: 'smooth',
      cursorStyle: 'line',
      cursorWidth: 2,
      
      // Comportamiento del editor
      roundedSelection: true,
      scrollBeyondLastLine: true,
      scrollBeyondLastColumn: 5,
      readOnly: false,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
      trimAutoWhitespace: true,
      
      // Folding de código (colapsar/expandir)
      folding: true,
      foldingStrategy: 'auto',
      foldingHighlight: true,
      showFoldingControls: 'mouseover',
      
      // Selección y edición múltiple
      multiCursorModifier: 'ctrlCmd',
      multiCursorMergeOverlapping: true,
      multiCursorPaste: 'spread',
      
      // Bracket matching y colorización
      matchBrackets: 'always',
      bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true
      },
      guides: {
        bracketPairs: true,
        bracketPairsHorizontal: 'active',
        highlightActiveBracketPair: true,
        indentation: true,
        highlightActiveIndentation: true
      },
      
      // Habilitar validación y diagnósticos
      'semanticHighlighting.enabled': true,
      
      // Find/Replace mejorado
      find: {
        seedSearchStringFromSelection: 'selection',
        autoFindInSelection: 'multiline',
        addExtraSpaceOnTop: true,
        loop: true
      },
      
      // Opciones mejoradas para autocompletado (IntelliSense estilo VS Code)
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnCommitCharacter: true,
      acceptSuggestionOnEnter: 'on',
      quickSuggestions: {
        other: 'on',
        comments: false,
        strings: 'on'
      },
      quickSuggestionsDelay: 10,
      wordBasedSuggestions: 'allDocuments',
      wordBasedSuggestionsOnlySameLanguage: false,
      
      // Parameter hints (tooltips de parámetros)
      parameterHints: {
        enabled: true,
        cycle: true
      },
      
      // Configuración de sugerencias (IntelliSense completo)
      suggest: {
        showMethods: true,
        showFunctions: true,
        showConstructors: true,
        showDeprecated: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showKeywords: true,
        showWords: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showSnippets: true,
        showUsers: true,
        showIssues: true,
        snippetsPreventQuickSuggestions: false,
        showInlineDetails: true,
        showStatusBar: true,
        filterGraceful: true,
        localityBonus: true,
        shareSuggestSelections: true,
        selectionMode: 'always',
        insertMode: 'insert',
        preview: true,
        previewMode: 'prefix',
      },
      
      // Snippets en la parte superior
      snippetSuggestions: 'top',
      tabCompletion: 'on',
      
      // Hover mejorado estilo VS Code
      hover: {
        enabled: true,
        delay: 300,
        sticky: true,
        above: true
      },
      
      // Mostrar problemas/errores inline con estilo
      renderValidationDecorations: 'on',
      
      // Formateo automático
      formatOnPaste: true,
      formatOnType: true,
      
      // Code lens (mostrar referencias, implementaciones)
      codeLens: true,
      codeLensFontFamily: "'Cascadia Code', 'Fira Code', 'Consolas'",
      codeLensFontSize: 12,
      
      // Colores y resaltado de símbolos
      occurrencesHighlight: 'multiFile',
      selectionHighlight: true,
      
      // Gutter (margen izquierdo) mejorado
      glyphMargin: true,
      lineDecorationsWidth: 10,
      
      // Accesibilidad y UX
      accessibilitySupport: 'auto',
      links: true,
      colorDecorators: true,
      colorDecoratorsLimit: 500,
      
      // Drag and drop
      dragAndDrop: true,
      
      // Context menu completo
      contextmenu: true,
      
      // Mouse wheel zoom
      mouseWheelZoom: true,
      
      // Sticky scroll (encabezados pegajosos)
      stickyScroll: {
        enabled: true,
        maxLineCount: 5,
        defaultModel: 'outlineModel'
      },
      
      // Indentación y guías visuales
      showUnused: true,
      showDeprecated: true,
      
      // Padding para mejor legibilidad
      padding: {
        top: 16,
        bottom: 16
      },
      
      // Sugerencias inline (como GitHub Copilot)
      inlineSuggest: {
        enabled: true,
        mode: 'subwordSmart',
        showToolbar: 'always',
        suppressSuggestions: false
      },
      
      // Peekable definition/references
      definitionLinkOpensInPeek: false,
      
      // Scrollbar estilo VS Code
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: true,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        verticalScrollbarSize: 14,
        horizontalScrollbarSize: 12,
        arrowSize: 11,
        handleMouseWheel: true,
        alwaysConsumeMouseWheel: true,
        verticalSliderSize: 14,
        horizontalSliderSize: 12
      },
      
      // Overview ruler (barra de la derecha con marcadores)
      overviewRulerBorder: true,
      overviewRulerLanes: 3,
    });

    // Cargar tipos de Discord.js
    fetch('/src/monaco-types/discord.d.ts')
      .then(res => res.text())
      .then(content => {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          content,
          'file:///node_modules/@types/discord.js/index.d.ts'
        );
      })
      .catch(err => console.warn('No se pudieron cargar los tipos de Discord.js:', err));

    // Añadir declaraciones de módulos para los path aliases
    monaco.languages.typescript.typescriptDefaults.addExtraLib(`
      declare module '@core/client' {
        import { Client } from 'discord.js';
        export const client: Client;
        export default client;
      }
      
      declare module '@core/database' {
        import { PrismaClient } from '@prisma/client';
        export const prisma: PrismaClient;
        export default prisma;
      }
      
      declare module '@core/*' {
        const content: any;
        export default content;
      }
      
      declare module '@commands/*' {
        const content: any;
        export default content;
      }
      
      declare module '@events/*' {
        const content: any;
        export default content;
      }
      
      declare module '@components/*' {
        const content: any;
        export default content;
      }
      
      declare module '@server/*' {
        const content: any;
        export default content;
      }
      
      declare module '@prisma' {
        export * from '@prisma/client';
      }
      
      // Tipos globales útiles
      declare global {
        namespace NodeJS {
          interface ProcessEnv {
            [key: string]: string | undefined;
          }
        }
        
        interface Console {
          log(...data: any[]): void;
          error(...data: any[]): void;
          warn(...data: any[]): void;
          info(...data: any[]): void;
          debug(...data: any[]): void;
        }
      }
      
      // Tipos comunes de Discord.js para autocompletado rápido
      declare module 'discord.js' {
        export class Client {}
        export class Message {}
        export class Interaction {}
        export class ChatInputCommandInteraction {}
        export class EmbedBuilder {}
        export class ButtonBuilder {}
        export class ActionRowBuilder<T> {}
        export class StringSelectMenuBuilder {}
        export class ModalBuilder {}
        export class TextInputBuilder {}
        export class AttachmentBuilder {}
        
        export enum ButtonStyle {
          Primary = 1,
          Secondary = 2,
          Success = 3,
          Danger = 4,
          Link = 5
        }
        
        export enum TextInputStyle {
          Short = 1,
          Paragraph = 2
        }
        
        export enum ChannelType {
          GuildText = 0,
          DM = 1,
          GuildVoice = 2,
          GroupDM = 3,
          GuildCategory = 4
        }
        
        export enum GatewayIntentBits {
          Guilds = 1,
          GuildMembers = 2,
          GuildBans = 4,
          GuildEmojisAndStickers = 8,
          GuildIntegrations = 16,
          GuildWebhooks = 32,
          GuildInvites = 64,
          GuildVoiceStates = 128,
          GuildPresences = 256,
          GuildMessages = 512,
          GuildMessageReactions = 1024,
          GuildMessageTyping = 2048,
          DirectMessages = 4096,
          DirectMessageReactions = 8192,
          DirectMessageTyping = 16384,
          MessageContent = 32768
        }
        
        export enum PermissionFlagsBits {
          Administrator = "8",
          ManageGuild = "32",
          ManageRoles = "268435456",
          ManageChannels = "16",
          KickMembers = "2",
          BanMembers = "4",
          SendMessages = "2048",
          ManageMessages = "8192"
        }
      }
    `, 'ts:path-aliases.d.ts');

    // Registrar snippets nativos adicionales de TypeScript/JavaScript
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        return {
          suggestions: [
            // Snippets nativos de TypeScript/JavaScript
            {
              label: 'for',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t${3}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'For Loop',
              range: range
            },
            {
              label: 'forof',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'for (const ${1:item} of ${2:array}) {\n\t${3}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'For-Of Loop',
              range: range
            },
            {
              label: 'forin',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'for (const ${1:key} in ${2:object}) {\n\tif (${2:object}.hasOwnProperty(${1:key})) {\n\t\t${3}\n\t}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'For-In Loop',
              range: range
            },
            {
              label: 'foreach',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.forEach((${2:item}) => {\n\t${3}\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'forEach Method',
              range: range
            },
            {
              label: 'while',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'while (${1:condition}) {\n\t${2}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'While Loop',
              range: range
            },
            {
              label: 'dowhile',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'do {\n\t${1}\n} while (${2:condition});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Do-While Loop',
              range: range
            },
            {
              label: 'if',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'if (${1:condition}) {\n\t${2}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If Statement',
              range: range
            },
            {
              label: 'ifelse',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'If-Else Statement',
              range: range
            },
            {
              label: 'elseif',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'else if (${1:condition}) {\n\t${2}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Else-If Statement',
              range: range
            },
            {
              label: 'switch',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'switch (${1:key}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\t${4}\n\t\tbreak;\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Switch Statement',
              range: range
            },
            {
              label: 'case',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'case ${1:value}:\n\t${2}\n\tbreak;',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Case Clause',
              range: range
            },
            {
              label: 'try',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'try {\n\t${1}\n} catch (${2:error}) {\n\t${3}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Try-Catch Block',
              range: range
            },
            {
              label: 'tryfinally',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'try {\n\t${1}\n} catch (${2:error}) {\n\t${3}\n} finally {\n\t${4}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Try-Catch-Finally Block',
              range: range
            },
            {
              label: 'function',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Function Declaration',
              range: range
            },
            {
              label: 'async',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'async function ${1:name}(${2:params}) {\n\t${3}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Async Function',
              range: range
            },
            {
              label: 'arrow',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '(${1:params}) => {\n\t${2}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Arrow Function',
              range: range
            },
            {
              label: 'asyncarrow',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'async (${1:params}) => {\n\t${2}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Async Arrow Function',
              range: range
            },
            {
              label: 'class',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t${3}\n\t}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Class Declaration',
              range: range
            },
            {
              label: 'constructor',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'constructor(${1:params}) {\n\t${2}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Constructor',
              range: range
            },
            {
              label: 'method',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:methodName}(${2:params}) {\n\t${3}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Method',
              range: range
            },
            {
              label: 'interface',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'interface ${1:InterfaceName} {\n\t${2}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Interface Declaration',
              range: range
            },
            {
              label: 'type',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'type ${1:TypeName} = ${2};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Type Alias',
              range: range
            },
            {
              label: 'enum',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'enum ${1:EnumName} {\n\t${2}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Enum Declaration',
              range: range
            },
            {
              label: 'const',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const ${1:name} = ${2};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Const Declaration',
              range: range
            },
            {
              label: 'let',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'let ${1:name} = ${2};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Let Declaration',
              range: range
            },
            {
              label: 'var',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'var ${1:name} = ${2};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Var Declaration',
              range: range
            },
            {
              label: 'import',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'import { ${2} } from \'${1:module}\';',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Import Statement',
              range: range
            },
            {
              label: 'importdefault',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'import ${2:name} from \'${1:module}\';',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Import Default',
              range: range
            },
            {
              label: 'importas',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'import * as ${2:name} from \'${1:module}\';',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Import * as',
              range: range
            },
            {
              label: 'export',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'export { ${1} };',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Export Statement',
              range: range
            },
            {
              label: 'exportdefault',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'export default ${1};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Export Default',
              range: range
            },
            {
              label: 'promise',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'new Promise((resolve, reject) => {\n\t${1}\n})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Promise',
              range: range
            },
            {
              label: 'then',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '.then((${1:result}) => {\n\t${2}\n})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Promise Then',
              range: range
            },
            {
              label: 'catch',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '.catch((${1:error}) => {\n\t${2}\n})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Promise Catch',
              range: range
            },
            {
              label: 'settimeout',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'setTimeout(() => {\n\t${2}\n}, ${1:delay});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Set Timeout',
              range: range
            },
            {
              label: 'setinterval',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'setInterval(() => {\n\t${2}\n}, ${1:delay});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Set Interval',
              range: range
            },
            {
              label: 'log',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'console.log(${1});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Console Log',
              range: range
            },
            {
              label: 'error',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'console.error(${1});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Console Error',
              range: range
            },
            {
              label: 'warn',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'console.warn(${1});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Console Warn',
              range: range
            },
            {
              label: 'table',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'console.table(${1});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Console Table',
              range: range
            },
            {
              label: 'map',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.map((${2:item}) => ${3})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array Map',
              range: range
            },
            {
              label: 'filter',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.filter((${2:item}) => ${3})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array Filter',
              range: range
            },
            {
              label: 'reduce',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.reduce((${2:acc}, ${3:item}) => ${4}, ${5:initial})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array Reduce',
              range: range
            },
            {
              label: 'find',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.find((${2:item}) => ${3})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array Find',
              range: range
            },
            {
              label: 'some',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.some((${2:item}) => ${3})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array Some',
              range: range
            },
            {
              label: 'every',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.every((${2:item}) => ${3})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array Every',
              range: range
            },
            {
              label: 'sort',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '${1:array}.sort((a, b) => ${2})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Array Sort',
              range: range
            },
          ]
        };
      }
    });

    // Registrar snippets de Discord.js
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        return {
          suggestions: [
            // Client
            {
              label: 'djsClient',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const client = new Client({\n\tintents: [\n\t\tGatewayIntentBits.Guilds,\n\t\tGatewayIntentBits.GuildMessages,\n\t\tGatewayIntentBits.MessageContent\n\t]\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un nuevo cliente de Discord.js',
              range: range
            },
            // Message Command
            {
              label: 'djsMessageCommand',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'export default {\n\tname: "${1:commandName}",\n\ttype: "message" as const,\n\talias: [${2}],\n\texecute: async (message: Message, args: string[]) => {\n\t\t${3:// Tu código aquí}\n\t}\n};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Template para comando de mensaje',
              range: range
            },
            // Slash Command
            {
              label: 'djsSlashCommand',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'export default {\n\tname: "${1:commandName}",\n\ttype: "slash" as const,\n\tdescription: "${2:Description}",\n\texecute: async (interaction: ChatInputCommandInteraction) => {\n\t\t${3:// Tu código aquí}\n\t}\n};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Template para comando slash',
              range: range
            },
            // Embed
            {
              label: 'djsEmbed',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'new EmbedBuilder()\n\t.setColor(${1:"#0099ff"})\n\t.setTitle("${2:Title}")\n\t.setDescription("${3:Description}")\n\t.setTimestamp()',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un embed de Discord',
              range: range
            },
            // Button
            {
              label: 'djsButton',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'new ButtonBuilder()\n\t.setCustomId("${1:customId}")\n\t.setLabel("${2:Label}")\n\t.setStyle(ButtonStyle.${3:Primary})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un botón',
              range: range
            },
            // Action Row
            {
              label: 'djsActionRow',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'new ActionRowBuilder<ButtonBuilder>()\n\t.addComponents(${1})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear una fila de acciones',
              range: range
            },
            // Select Menu
            {
              label: 'djsSelectMenu',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'new StringSelectMenuBuilder()\n\t.setCustomId("${1:customId}")\n\t.setPlaceholder("${2:Placeholder}")\n\t.addOptions(\n\t\t{\n\t\t\tlabel: "${3:Label}",\n\t\t\tvalue: "${4:value}",\n\t\t\tdescription: "${5:Description}"\n\t\t}\n\t)',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un menú de selección',
              range: range
            },
            // Modal
            {
              label: 'djsModal',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'new ModalBuilder()\n\t.setCustomId("${1:customId}")\n\t.setTitle("${2:Title}")',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un modal',
              range: range
            },
            // Text Input
            {
              label: 'djsTextInput',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'new TextInputBuilder()\n\t.setCustomId("${1:customId}")\n\t.setLabel("${2:Label}")\n\t.setStyle(TextInputStyle.${3:Short})',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un input de texto para modal',
              range: range
            },
            // Interaction Reply
            {
              label: 'djsReply',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'await interaction.reply({\n\tcontent: "${1:Message}",\n\tephemeral: ${2:true}\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Responder a una interacción',
              range: range
            },
            // Interaction DeferReply
            {
              label: 'djsDeferReply',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'await interaction.deferReply({ ephemeral: ${1:true} });',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Diferir respuesta de interacción',
              range: range
            },
            // Collector
            {
              label: 'djsCollector',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const collector = ${1:channel}.createMessageCollector({\n\tfilter: (m) => m.author.id === ${2:userId},\n\ttime: ${3:60000}\n});\n\ncollector.on("collect", (message) => {\n\t${4:// Procesar mensaje}\n});\n\ncollector.on("end", (collected) => {\n\t${5:// Finalizar}\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un collector de mensajes',
              range: range
            },
            // Permission Check
            {
              label: 'djsPermissions',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'if (!${1:member}.permissions.has(PermissionFlagsBits.${2:Administrator})) {\n\treturn ${3:interaction}.reply({\n\t\tcontent: "No tienes permisos suficientes.",\n\t\tephemeral: true\n\t});\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Verificar permisos de usuario',
              range: range
            },
            // Event Ready
            {
              label: 'djsEventReady',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'export default {\n\tname: "ready",\n\tonce: true,\n\texecute: async (client: Client) => {\n\t\tconsole.log(`✅ ${client.user?.tag} está listo!`);\n\t}\n};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Template para evento ready',
              range: range
            },
            // Event Message Create
            {
              label: 'djsEventMessage',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'export default {\n\tname: "messageCreate",\n\texecute: async (message: Message) => {\n\t\tif (message.author.bot) return;\n\t\t${1:// Tu código aquí}\n\t}\n};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Template para evento messageCreate',
              range: range
            },
            // Event Interaction Create
            {
              label: 'djsEventInteraction',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'export default {\n\tname: "interactionCreate",\n\texecute: async (interaction: Interaction) => {\n\t\tif (!interaction.isChatInputCommand()) return;\n\t\t${1:// Tu código aquí}\n\t}\n};',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Template para evento interactionCreate',
              range: range
            },
            // Attachment
            {
              label: 'djsAttachment',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'new AttachmentBuilder(${1:buffer})\n\t.setName("${2:filename.png}")',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un attachment',
              range: range
            },
            // Slash Command Option String
            {
              label: 'djsOptionString',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '{\n\tname: "${1:optionName}",\n\tdescription: "${2:Description}",\n\ttype: ApplicationCommandOptionType.String,\n\trequired: ${3:true}\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Opción de tipo String para comando slash',
              range: range
            },
            // Message Send
            {
              label: 'djsSend',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'await ${1:channel}.send({\n\tcontent: "${2:Message}"\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Enviar un mensaje',
              range: range
            },
            // User Fetch
            {
              label: 'djsFetchUser',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const user = await client.users.fetch("${1:userId}");',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Obtener un usuario',
              range: range
            },
            // Guild Fetch
            {
              label: 'djsFetchGuild',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const guild = await client.guilds.fetch("${1:guildId}");',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Obtener un servidor',
              range: range
            },
            // Role Create
            {
              label: 'djsCreateRole',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const role = await ${1:guild}.roles.create({\n\tname: "${2:Role Name}",\n\tcolor: ${3:"#0099ff"},\n\tpermissions: [${4}]\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un rol',
              range: range
            },
            // Channel Create
            {
              label: 'djsCreateChannel',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const channel = await ${1:guild}.channels.create({\n\tname: "${2:channel-name}",\n\ttype: ChannelType.${3:GuildText}\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Crear un canal',
              range: range
            },
            // Message Reaction
            {
              label: 'djsReact',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'await ${1:message}.react("${2:emoji}");',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Reaccionar a un mensaje',
              range: range
            },
            // Member Kick
            {
              label: 'djsKick',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'await ${1:member}.kick("${2:Razón}");',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Expulsar un miembro',
              range: range
            },
            // Member Ban
            {
              label: 'djsBan',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'await ${1:member}.ban({\n\treason: "${2:Razón}",\n\tdeleteMessageDays: ${3:7}\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Banear un miembro',
              range: range
            },
            // Timeout
            {
              label: 'djsTimeout',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'await ${1:member}.timeout(${2:60000}, "${3:Razón}");',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Silenciar temporalmente un miembro',
              range: range
            },
            // Voice Connect
            {
              label: 'djsVoiceConnect',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'const connection = joinVoiceChannel({\n\tchannelId: ${1:voiceChannel}.id,\n\tguildId: ${1:voiceChannel}.guild.id,\n\tadapterCreator: ${1:voiceChannel}.guild.voiceAdapterCreator\n});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Conectarse a un canal de voz',
              range: range
            },
          ]
        };
      }
    });

    // ============================================
    // CODEIUM INLINE COMPLETION PROVIDER
    // ============================================
    
    let lastCompletionTimeout: number | null = null;
    
    // Solo registrar si el usuario tiene activadas las sugerencias inline
    const inlineSuggestionsEnabled = localStorage.getItem('gemini_inline_suggestions') === 'true';
    
    if (inlineSuggestionsEnabled) {
      console.log('✅ Sugerencias inline de Gemini habilitadas');
      
      // Registrar proveedor de completación inline (estilo Copilot)
      monaco.languages.registerInlineCompletionsProvider('typescript', {
        provideInlineCompletions: async (model, position) => {
          // Cancelar solicitud anterior si existe
          if (lastCompletionTimeout) {
            clearTimeout(lastCompletionTimeout);
          }
          
          return new Promise((resolve) => {
            lastCompletionTimeout = window.setTimeout(async () => {
              try {
                const text = model.getValue();
                const offset = model.getOffsetAt(position);
                const lineContent = model.getLineContent(position.lineNumber);
                
                // Solo sugerir si hay contenido en la línea actual o si es inicio de línea
                if (lineContent.trim().length === 0 && position.column > 1) {
                  resolve({ items: [] });
                  return;
                }
                
                console.log('🤖 Solicitando sugerencia de Gemini...');
                
                // Llamar al backend para obtener sugerencias
                const suggestions = await invoke<string[]>('get_gemini_completion', {
                  text,
                  cursorPosition: offset,
                  language: 'typescript',
                  filePath: props.fileInfo?.path || 'untitled.ts',
                  apiKey: localStorage.getItem('gemini_api_key') || '',
                  model: localStorage.getItem('gemini_model') || 'gemini-2.5-flash',
                  agentMode: localStorage.getItem('gemini_agent_mode') === 'true'
                });
                
                if (suggestions && suggestions.length > 0) {
                  console.log('✅ Sugerencias recibidas:', suggestions);
                  const items = suggestions.map((suggestion: string) => ({
                    insertText: suggestion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column
                    }
                  }));
                  
                  console.log('📤 Items a mostrar:', items);
                  resolve({ items });
                } else {
                  console.log('⚠️ No se recibieron sugerencias');
                  resolve({ items: [] });
                }
              } catch (error) {
                console.error('❌ Error obteniendo sugerencia:', error);
                resolve({ items: [] });
              }
            }, 500); // Debounce de 500ms
          });
        },
        // Método requerido por Monaco para liberar recursos
        disposeInlineCompletions: () => {}
      });
      
      // También para JavaScript
      monaco.languages.registerInlineCompletionsProvider('javascript', {
        provideInlineCompletions: async (model, position) => {
          if (lastCompletionTimeout) {
            clearTimeout(lastCompletionTimeout);
          }
          
          return new Promise((resolve) => {
            lastCompletionTimeout = window.setTimeout(async () => {
              try {
                const text = model.getValue();
                const offset = model.getOffsetAt(position);
                
                const suggestions = await invoke<string[]>('get_gemini_completion', {
                  text,
                  cursorPosition: offset,
                  language: 'javascript',
                  filePath: props.fileInfo?.path || 'untitled.js',
                  apiKey: localStorage.getItem('gemini_api_key') || '',
                  model: localStorage.getItem('gemini_model') || 'gemini-2.5-flash',
                  agentMode: localStorage.getItem('gemini_agent_mode') === 'true'
                });
                
                if (suggestions && suggestions.length > 0) {
                  const items = suggestions.map((suggestion: string) => ({
                    insertText: suggestion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column
                    }
                  }));
                  
                  resolve({ items });
                } else {
                  resolve({ items: [] });
                }
              } catch (error) {
                console.error('❌ Error obteniendo sugerencia:', error);
                resolve({ items: [] });
              }
            }, 500);
          });
        },
        disposeInlineCompletions: () => {}
      });
    } else {
      console.log('ℹ️ Sugerencias inline de Gemini deshabilitadas. Usa los botones de acción (Fix, Explain, etc.) para invocar la IA.');
    }
    
    console.log('🤖 Gemini inline completion provider registrado');

    // Detectar cambios
    editor.onDidChangeModelContent(() => {
      hasChanges.value = true;
      emit('change', editor!.getValue());
    });

    // Detectar selección de texto para mostrar widget de IA
    editor.onDidChangeCursorSelection(() => {
      const selection = editor!.getSelection();
      if (selection && !selection.isEmpty()) {
        const text = editor!.getModel()!.getValueInRange(selection);
        if (text.trim().length > 0) {
          selectedText.value = text;
          console.log('✅ Texto seleccionado para IA:', text.substring(0, 50) + '...');
          
          // Posicionar widget relativo al editor
          const layoutInfo = editor!.getLayoutInfo();
          const selectionStart = editor!.getScrolledVisiblePosition(selection.getStartPosition());
          
          if (selectionStart) {
            aiWidgetPosition.value = {
              top: `${Math.max(0, selectionStart.top - 50)}px`,
              left: `${Math.min(selectionStart.left, layoutInfo.width - 400)}px`
            };
            showAIActions.value = true;
            console.log('🔧 Widget mostrado');
          }
        }
      } else {
        showAIActions.value = false;
        selectedText.value = '';
      }
    });

    // Atajos de teclado
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });
  }
});

// Actualizar contenido cuando cambia el archivo
watch(() => props.content, (newContent) => {
  if (editor && editor.getValue() !== newContent) {
    const position = editor.getPosition();
    editor.setValue(newContent);
    if (position) {
      editor.setPosition(position);
    }
    hasChanges.value = false;
  }
});

// Actualizar lenguaje basado en el tipo de archivo
watch(() => props.fileInfo, async (newFileInfo) => {
  if (editor && newFileInfo) {
    await nextTick();
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, 'typescript');
    }
  }
});

onUnmounted(() => {
  if (editor) {
    editor.dispose();
  }
});
</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  position: relative;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  min-height: 40px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 16px;
}

.file-path {
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
}

.unsaved-indicator {
  color: #ffffff;
  font-size: 20px;
  line-height: 1;
}

.header-right {
  display: flex;
  gap: 8px;
}

.save-btn {
  padding: 6px 12px;
  background-color: #0e639c;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.save-btn:hover:not(:disabled) {
  background-color: #1177bb;
}

.save-btn:disabled {
  background-color: #3e3e42;
  cursor: not-allowed;
  opacity: 0.5;
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

/* Widget de acciones de IA */
.ai-actions-widget {
  position: absolute;
  display: flex;
  gap: 6px;
  padding: 8px;
  background: #252526;
  border: 2px solid #007acc;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
  z-index: 999999;
  pointer-events: all;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.ai-action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  color: #fff;
  white-space: nowrap;
}

.ai-action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fix-btn {
  background: linear-gradient(135deg, #f48771 0%, #e74c3c 100%);
}

.fix-btn:hover {
  background: linear-gradient(135deg, #ff9a85 0%, #ff5c4d 100%);
}

.explain-btn {
  background: linear-gradient(135deg, #4fc3f7 0%, #2196f3 100%);
}

.explain-btn:hover {
  background: linear-gradient(135deg, #6dd5f9 0%, #42a5f5 100%);
}

.refactor-btn {
  background: linear-gradient(135deg, #66bb6a 0%, #4caf50 100%);
}

.refactor-btn:hover {
  background: linear-gradient(135deg, #81c784 0%, #66bb6a 100%);
}

.optimize-btn {
  background: linear-gradient(135deg, #ffb74d 0%, #ff9800 100%);
}

.optimize-btn:hover {
  background: linear-gradient(135deg, #ffca64 0%, #ffa726 100%);
}

/* Estilos para mejor visualización de errores y warnings */
:deep(.monaco-editor .squiggly-error) {
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23f48771'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") repeat-x bottom left;
  background-size: 6px 3px;
}

:deep(.monaco-editor .squiggly-warning) {
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23cca700'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") repeat-x bottom left;
  background-size: 6px 3px;
}

:deep(.monaco-editor .squiggly-info) {
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%2375beff'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") repeat-x bottom left;
  background-size: 6px 3px;
}

:deep(.monaco-editor .squiggly-hint) {
  background: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23eeeeee6b'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E") repeat-x bottom left;
  background-size: 6px 3px;
}

/* Mejorar el estilo de las sugerencias */
:deep(.monaco-editor .suggest-widget) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  border: 1px solid #454545;
}

:deep(.monaco-editor .suggest-widget .monaco-list .monaco-list-row.focused) {
  background-color: #062f4a !important;
}

:deep(.monaco-editor .suggest-widget .monaco-list .monaco-list-row .monaco-highlighted-label .highlight) {
  color: #0097fb;
  font-weight: bold;
}

/* Mejorar el widget de hover */
:deep(.monaco-editor .monaco-hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  border: 1px solid #454545;
}

/* Estilo para la barra de scroll */
:deep(.monaco-scrollable-element > .scrollbar > .slider) {
  background: rgba(121, 121, 121, 0.4) !important;
}

:deep(.monaco-scrollable-element > .scrollbar > .slider:hover) {
  background: rgba(100, 100, 100, 0.7) !important;
}

:deep(.monaco-scrollable-element > .scrollbar > .slider.active) {
  background: rgba(191, 191, 191, 0.4) !important;
}

/* Mejorar minimap */
:deep(.monaco-editor .minimap-slider) {
  background: rgba(79, 129, 184, 0.3) !important;
}

:deep(.monaco-editor .minimap-slider:hover) {
  background: rgba(79, 129, 184, 0.5) !important;
}
</style>
