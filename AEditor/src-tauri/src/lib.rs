use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};
use discord_rich_presence::{activity, DiscordIpc, DiscordIpcClient};

// Módulos nuevos
mod activity_log;
mod backup;
mod diagnostics;

use activity_log::{ActivityLog, LogEntry};
use backup::{Backup, BackupManager};
use diagnostics::{DiagnosticsManager, DiagnosticError};

// Cliente Discord RPC global
static DISCORD_CLIENT: Mutex<Option<DiscordIpcClient>> = Mutex::new(None);
static ACTIVITY_LOG: Mutex<Option<ActivityLog>> = Mutex::new(None);
static BACKUP_MANAGER: Mutex<Option<BackupManager>> = Mutex::new(None);
static DIAGNOSTICS: Mutex<Option<DiagnosticsManager>> = Mutex::new(None);

// Structs para Codeium API
#[derive(Debug, Serialize, Deserialize)]
struct CodeiumCompletionRequest {
    text: String,
    cursor_position: usize,
    language: String,
    file_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct CodeiumCompletion {
    text: String,
    range: CodeiumRange,
}

#[derive(Debug, Serialize, Deserialize)]
struct CodeiumRange {
    start_line: usize,
    start_column: usize,
    end_line: usize,
    end_column: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileInfo {
    name: String,
    path: String,
    relative_path: String,
    #[serde(rename = "type")]
    file_type: String,
    command_type: Option<String>,
    event_type: Option<String>,
    folder: Option<String>, // Nueva: para mostrar la subcarpeta
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectStats {
    message_commands: u32,
    slash_commands: u32,
    standard_events: u32,
    custom_events: u32,
    total_commands: u32,
    total_events: u32,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn validate_project_path(path: String) -> Result<bool, String> {
    let project_path = Path::new(&path);
    
    // Verificar que existe el directorio
    if !project_path.exists() || !project_path.is_dir() {
        return Ok(false);
    }
    
    // Verificar que tiene la estructura correcta (src/commands y src/events)
    let commands_dir = project_path.join("src").join("commands");
    let events_dir = project_path.join("src").join("events");
    
    Ok(commands_dir.exists() && events_dir.exists())
}

#[tauri::command]
fn get_project_root() -> Result<String, String> {
    // Obtener la ruta del ejecutable y navegar hasta el directorio del proyecto
    let current_dir = std::env::current_dir()
        .map_err(|e| e.to_string())?;
    
    // Desde AEditor, subir un nivel para llegar a la raíz del proyecto
    let project_root = current_dir.parent()
        .ok_or("No se pudo determinar el directorio raíz del proyecto")?;
    
    Ok(project_root.to_string_lossy().to_string())
}

#[tauri::command]
fn scan_commands(project_root: String) -> Result<Vec<FileInfo>, String> {
    let commands_dir = Path::new(&project_root).join("src").join("commands");
    let mut commands = Vec::new();
    
    println!("🔍 Escaneando comandos en: {}", commands_dir.display());
    
    if !commands_dir.exists() {
        let err_msg = format!("El directorio de comandos no existe: {}", commands_dir.display());
        println!("❌ {}", err_msg);
        return Err(err_msg);
    }
    
    scan_directory_recursive(&commands_dir, &commands_dir, &mut commands, "command")?;
    
    println!("✅ Encontrados {} comandos", commands.len());
    
    Ok(commands)
}

#[tauri::command]
fn scan_events(project_root: String) -> Result<Vec<FileInfo>, String> {
    let events_dir = Path::new(&project_root).join("src").join("events");
    let mut events = Vec::new();
    
    println!("🔍 Escaneando eventos en: {}", events_dir.display());
    
    if !events_dir.exists() {
        let err_msg = format!("El directorio de eventos no existe: {}", events_dir.display());
        println!("❌ {}", err_msg);
        return Err(err_msg);
    }
    
    scan_directory_recursive(&events_dir, &events_dir, &mut events, "event")?;
    
    println!("✅ Encontrados {} eventos", events.len());
    
    Ok(events)
}

#[tauri::command]
fn get_project_stats(project_root: String) -> Result<ProjectStats, String> {
    let commands = scan_commands(project_root.clone())?;
    let events = scan_events(project_root)?;
    
    let mut stats = ProjectStats {
        message_commands: 0,
        slash_commands: 0,
        standard_events: 0,
        custom_events: 0,
        total_commands: commands.len() as u32,
        total_events: events.len() as u32,
    };
    
    // Contar tipos de comandos leyendo archivos
    for cmd in &commands {
        if let Ok(content) = fs::read_to_string(&cmd.path) {
            if content.contains("type: 'slash'") || content.contains("type: \"slash\"") {
                stats.slash_commands += 1;
            } else if content.contains("type: 'message'") || content.contains("type: \"message\"") {
                stats.message_commands += 1;
            }
        }
    }
    
    // Contar tipos de eventos
    for event in &events {
        if let Some(ref event_type) = event.event_type {
            match event_type.as_str() {
                "standard" => stats.standard_events += 1,
                "extra" => stats.custom_events += 1,
                _ => {}
            }
        }
    }
    
    Ok(stats)
}

#[tauri::command]
fn read_file_content(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file_content(file_path: String, content: String) -> Result<(), String> {
    // Crear directorios si no existen
    if let Some(parent) = Path::new(&file_path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    fs::write(&file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn init_discord_rpc() -> Result<(), String> {
    let mut client_lock = DISCORD_CLIENT.lock().unwrap();
    
    // ID de la aplicación Discord (debes crear una en https://discord.com/developers/applications)
    let client_id = "991062751633883136"; // Reemplazar con tu Application ID
    
    let mut client = DiscordIpcClient::new(client_id)
        .map_err(|e| format!("Error creando cliente Discord: {:?}", e))?;
    
    client.connect()
        .map_err(|e| format!("Error conectando a Discord: {:?}", e))?;
    
    // Actividad inicial
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    client.set_activity(activity::Activity::new()
        .state("Editando bot de Discord")
        .details("En el menú principal")
        .timestamps(activity::Timestamps::new().start(timestamp))
        .assets(activity::Assets::new()
            .large_image("amayo_logo")
            .large_text("Amayo Bot Editor")
            .small_image("code")
            .small_text("Programando")
        )
    ).map_err(|e| format!("Error estableciendo actividad: {:?}", e))?;
    
    *client_lock = Some(client);
    Ok(())
}

#[tauri::command]
fn update_discord_rpc(details: String, state: String, file_name: Option<String>) -> Result<(), String> {
    let mut client_lock = DISCORD_CLIENT.lock().unwrap();
    
    if let Some(client) = client_lock.as_mut() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        // Crear el state final antes de usarlo
        let final_state = if let Some(name) = file_name {
            format!("{} | {}", state, name)
        } else {
            state
        };
        
        let activity = activity::Activity::new()
            .details(&details)
            .state(&final_state)
            .timestamps(activity::Timestamps::new().start(timestamp))
            .assets(activity::Assets::new()
                .large_image("amayo_logo")
                .large_text("Amayo Bot Editor")
                .small_image("code")
                .small_text("Programando")
            );
        
        client.set_activity(activity)
            .map_err(|e| format!("Error actualizando actividad: {:?}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn disconnect_discord_rpc() -> Result<(), String> {
    let mut client_lock = DISCORD_CLIENT.lock().unwrap();
    
    if let Some(mut client) = client_lock.take() {
        client.close()
            .map_err(|e| format!("Error cerrando conexión Discord: {:?}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn scan_all_files(project_root: String) -> Result<Vec<FileInfo>, String> {
    let src_path = Path::new(&project_root).join("src");
    let mut results = Vec::new();
    
    if src_path.exists() {
        scan_all_recursive(&src_path, &src_path, &mut results)?;
    }
    
    Ok(results)
}

fn scan_all_recursive(
    dir: &Path,
    base_dir: &Path,
    results: &mut Vec<FileInfo>,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_dir() {
            // Recursivamente escanear subdirectorios
            scan_all_recursive(&path, base_dir, results)?;
        } else if path.is_file() {
            // Solo archivos TypeScript y JavaScript
            if let Some(extension) = path.extension() {
                if extension == "ts" || extension == "js" {
                    let relative_path = path.strip_prefix(base_dir).unwrap_or(&path);
                    let name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();
                    
                    let folder = path.parent()
                        .and_then(|p| p.strip_prefix(base_dir).ok())
                        .and_then(|p| p.to_str())
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string());
                    
                    results.push(FileInfo {
                        name,
                        path: path.to_string_lossy().to_string(),
                        relative_path: relative_path.to_string_lossy().to_string(),
                        file_type: "file".to_string(),
                        command_type: None,
                        event_type: None,
                        folder,
                    });
                }
            }
        }
    }
    
    Ok(())
}

fn scan_directory_recursive(
    dir: &Path,
    base_dir: &Path,
    results: &mut Vec<FileInfo>,
    file_type: &str,
) -> Result<(), String> {
    println!("📂 Escaneando directorio: {}", dir.display());
    
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("ts") {
            println!("  📄 Archivo encontrado: {}", path.file_name().unwrap().to_string_lossy());
            
            let name = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            
            let relative_path = path.strip_prefix(base_dir)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            
            // Detectar la carpeta padre para organizar
            let folder = path.parent()
                .and_then(|p| p.strip_prefix(base_dir).ok())
                .and_then(|p| p.to_str())
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string());
            
            let (ft, cmd_type, evt_type) = match file_type {
                "command" => {
                    // Detectar tipo de comando leyendo el archivo
                    let cmd_type = if let Ok(content) = fs::read_to_string(&path) {
                        if content.contains("type: 'slash'") || content.contains("type: \"slash\"") {
                            Some("slash".to_string())
                        } else {
                            Some("message".to_string())
                        }
                    } else {
                        Some("message".to_string())
                    };
                    ("command".to_string(), cmd_type, None)
                },
                "event" => {
                    // Detectar si está en subcarpeta "extras"
                    let is_extra = folder.as_ref()
                        .map(|f| f.contains("extras") || f.contains("extra"))
                        .unwrap_or(false);
                    let evt_type = if is_extra {
                        Some("extra".to_string())
                    } else {
                        Some("standard".to_string())
                    };
                    ("event".to_string(), None, evt_type)
                },
                _ => (file_type.to_string(), None, None),
            };
            
            results.push(FileInfo {
                name,
                path: path.to_string_lossy().to_string(),
                relative_path,
                file_type: ft,
                command_type: cmd_type,
                event_type: evt_type,
                folder,
            });
        } else if path.is_dir() {
            // Recursivamente escanear subdirectorios
            scan_directory_recursive(&path, base_dir, results, file_type)?;
        }
    }
    
    Ok(())
}

fn scan_directory(
    dir: &Path,
    base_dir: &Path,
    results: &mut Vec<FileInfo>,
    file_type: &str,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("ts") {
            let name = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            
            let (ft, cmd_type, evt_type) = match file_type {
                "command" => {
                    // Detectar tipo de comando leyendo el archivo
                    let cmd_type = if let Ok(content) = fs::read_to_string(&path) {
                        if content.contains("type: 'slash'") || content.contains("type: \"slash\"") {
                            Some("slash".to_string())
                        } else {
                            Some("message".to_string())
                        }
                    } else {
                        Some("message".to_string())
                    };
                    ("command".to_string(), cmd_type, None)
                },
                "event_extra" => ("event".to_string(), None, Some("extra".to_string())),
                _ => (file_type.to_string(), None, None),
            };
            
            let relative_path = path.strip_prefix(base_dir)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            
            let folder = path.parent()
                .and_then(|p| p.strip_prefix(base_dir).ok())
                .and_then(|p| p.to_str())
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string());
            
            results.push(FileInfo {
                name,
                path: path.to_string_lossy().to_string(),
                relative_path,
                file_type: ft,
                command_type: cmd_type,
                event_type: evt_type,
                folder,
            });
        } else if path.is_dir() {
            scan_directory(&path, base_dir, results, file_type)?;
        }
    }
    
    Ok(())
}

// Comandos para gestión de archivos y carpetas
#[tauri::command]
fn create_file(file_path: String, content: Option<String>) -> Result<(), String> {
    let path = Path::new(&file_path);
    
    // Crear directorios padre si no existen
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    
    // Crear archivo con contenido o vacío
    let default_content = content.unwrap_or_default();
    fs::write(path, default_content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn create_folder(folder_path: String) -> Result<(), String> {
    fs::create_dir_all(&folder_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_file(file_path: String) -> Result<(), String> {
    use std::path::Path;
    
    let path = Path::new(&file_path);
    
    // Verificar si el archivo existe
    if !path.exists() {
        return Err(format!("El archivo no existe: {}", file_path));
    }
    
    // Verificar si es un archivo (no directorio)
    if !path.is_file() {
        return Err(format!("La ruta no es un archivo: {}", file_path));
    }
    
    // Intentar eliminar el archivo
    match fs::remove_file(&file_path) {
        Ok(_) => Ok(()),
        Err(e) => {
            // Proporcionar más detalles sobre el error
            let error_msg = match e.kind() {
                std::io::ErrorKind::PermissionDenied => {
                    format!("Permiso denegado para eliminar: {}. Ejecuta el editor como administrador.", file_path)
                },
                std::io::ErrorKind::NotFound => {
                    format!("Archivo no encontrado: {}", file_path)
                },
                _ => {
                    format!("Error al eliminar archivo: {} - {}", file_path, e)
                }
            };
            Err(error_msg)
        }
    }
}

#[tauri::command]
fn delete_folder(folder_path: String) -> Result<(), String> {
    use std::path::Path;
    
    let path = Path::new(&folder_path);
    
    // Verificar si el directorio existe
    if !path.exists() {
        return Err(format!("El directorio no existe: {}", folder_path));
    }
    
    // Verificar si es un directorio
    if !path.is_dir() {
        return Err(format!("La ruta no es un directorio: {}", folder_path));
    }
    
    // Intentar eliminar el directorio
    match fs::remove_dir_all(&folder_path) {
        Ok(_) => Ok(()),
        Err(e) => {
            let error_msg = match e.kind() {
                std::io::ErrorKind::PermissionDenied => {
                    format!("Permiso denegado para eliminar directorio: {}. Ejecuta el editor como administrador.", folder_path)
                },
                std::io::ErrorKind::NotFound => {
                    format!("Directorio no encontrado: {}", folder_path)
                },
                _ => {
                    format!("Error al eliminar directorio: {} - {}", folder_path, e)
                }
            };
            Err(error_msg)
        }
    }
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    Ok(())
}

// Comandos para Prisma
#[tauri::command]
fn prisma_db_push(project_root: String) -> Result<String, String> {
    use std::process::Command;
    
    let output = Command::new("npx")
        .args(&["prisma", "db", "push"])
        .current_dir(&project_root)
        .output()
        .map_err(|e| format!("Error ejecutando prisma db push: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn prisma_db_pull(project_root: String) -> Result<String, String> {
    use std::process::Command;
    
    let output = Command::new("npx")
        .args(&["prisma", "db", "pull"])
        .current_dir(&project_root)
        .output()
        .map_err(|e| format!("Error ejecutando prisma db pull: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// Comandos para .env
#[tauri::command]
fn read_env_file(project_root: String) -> Result<String, String> {
    let env_path = Path::new(&project_root).join(".env");
    if env_path.exists() {
        fs::read_to_string(&env_path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
fn write_env_file(project_root: String, content: String) -> Result<(), String> {
    let env_path = Path::new(&project_root).join(".env");
    fs::write(&env_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn scan_env_variables(project_root: String) -> Result<Vec<String>, String> {
    use std::collections::HashSet;
    let src_path = Path::new(&project_root).join("src");
    let prisma_path = Path::new(&project_root).join("prisma");
    let mut env_vars = HashSet::new();
    
    // Regex para encontrar process.env.VARIABLE
    let re = regex::Regex::new(r"process\.env\.(\w+)").unwrap();
    
    // Escanear src/
    if src_path.exists() {
        scan_for_env_vars(&src_path, &re, &mut env_vars)?;
    }
    
    // Escanear prisma/
    if prisma_path.exists() {
        scan_for_env_vars(&prisma_path, &re, &mut env_vars)?;
    }
    
    Ok(env_vars.into_iter().collect())
}

// Nueva función que devuelve las ubicaciones exactas de cada variable
#[derive(serde::Serialize)]
struct VarLocation {
    variable: String,
    file: String,
    line: usize,
    snippet: String,
}

#[tauri::command]
fn scan_env_variables_with_locations(project_root: String) -> Result<Vec<VarLocation>, String> {
    let src_path = Path::new(&project_root).join("src");
    let prisma_path = Path::new(&project_root).join("prisma");
    let mut locations = Vec::new();
    
    // Regex para encontrar process.env.VARIABLE
    let re = regex::Regex::new(r"process\.env\.(\w+)").unwrap();
    
    // Escanear src/
    if src_path.exists() {
        scan_for_env_vars_with_locations(&src_path, &re, &mut locations, &project_root)?;
    }
    
    // Escanear prisma/
    if prisma_path.exists() {
        scan_for_env_vars_with_locations(&prisma_path, &re, &mut locations, &project_root)?;
    }
    
    Ok(locations)
}

fn scan_for_env_vars_with_locations(
    dir: &Path,
    re: &regex::Regex,
    locations: &mut Vec<VarLocation>,
    project_root: &str,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "ts" || ext == "js" || ext == "prisma" {
                    if let Ok(content) = fs::read_to_string(&path) {
                        let lines: Vec<&str> = content.lines().collect();
                        
                        for (line_num, line) in lines.iter().enumerate() {
                            for cap in re.captures_iter(line) {
                                if let Some(var) = cap.get(1) {
                                    // Crear ruta relativa
                                    let relative_path = path
                                        .strip_prefix(project_root)
                                        .unwrap_or(&path)
                                        .to_string_lossy()
                                        .to_string();
                                    
                                    locations.push(VarLocation {
                                        variable: var.as_str().to_string(),
                                        file: relative_path,
                                        line: line_num + 1,
                                        snippet: line.trim().to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } else if path.is_dir() {
            scan_for_env_vars_with_locations(&path, re, locations, project_root)?;
        }
    }
    
    Ok(())
}

fn scan_for_env_vars(
    dir: &Path,
    re: &regex::Regex,
    vars: &mut std::collections::HashSet<String>,
) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "ts" || ext == "js" || ext == "prisma" {
                    if let Ok(content) = fs::read_to_string(&path) {
                        for cap in re.captures_iter(&content) {
                            if let Some(var) = cap.get(1) {
                                vars.insert(var.as_str().to_string());
                            }
                        }
                    }
                }
            }
        } else if path.is_dir() {
            scan_for_env_vars(&path, re, vars)?;
        }
    }
    
    Ok(())
}

// Comandos para package.json scripts
#[tauri::command]
fn get_package_scripts(project_root: String) -> Result<Vec<(String, String)>, String> {
    let package_json_path = Path::new(&project_root).join("package.json");
    
    if !package_json_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&package_json_path).map_err(|e| e.to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    let mut scripts = Vec::new();
    
    if let Some(scripts_obj) = json.get("scripts").and_then(|s| s.as_object()) {
        for (name, command) in scripts_obj {
            if let Some(cmd) = command.as_str() {
                scripts.push((name.clone(), cmd.to_string()));
            }
        }
    }
    
    Ok(scripts)
}

// ============================================
// GEMINI API INTEGRATION (Code Completion)
// ============================================

#[derive(serde::Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    generation_config: GeminiGenerationConfig,
}

#[derive(serde::Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(serde::Serialize)]
struct GeminiPart {
    text: String,
}

#[derive(serde::Serialize)]
struct GeminiGenerationConfig {
    temperature: f32,
    #[serde(rename = "maxOutputTokens")]
    max_output_tokens: i32,
    #[serde(rename = "candidateCount")]
    candidate_count: i32,
    #[serde(rename = "thinkingConfig", skip_serializing_if = "Option::is_none")]
    thinking_config: Option<GeminiThinkingConfig>,
}

#[derive(serde::Serialize)]
struct GeminiThinkingConfig {
    #[serde(rename = "thinkingBudget")]
    thinking_budget: i32,
    #[serde(rename = "includeThoughts")]
    include_thoughts: bool,
}

#[derive(serde::Deserialize)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(serde::Deserialize)]
struct GeminiCandidate {
    content: GeminiResponseContent,
}

#[derive(serde::Deserialize)]
struct GeminiResponseContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(serde::Deserialize)]
struct GeminiResponsePart {
    text: String,
}

#[tauri::command]
async fn get_gemini_completion(
    text: String,
    cursor_position: usize,
    language: String,
    file_path: String,
    api_key: String,
    model: String,
    agent_mode: Option<bool>,
) -> Result<Vec<String>, String> {
    use reqwest::Client;
    
    if api_key.is_empty() {
        return Ok(vec![]);
    }
    
    // Extraer contexto antes y después del cursor
    let before = text.chars().take(cursor_position).collect::<String>();
    let after = text.chars().skip(cursor_position).take(200).collect::<String>();
    
    // Tomar últimas 15 líneas de contexto
    let context_lines: Vec<&str> = before.lines().rev().take(15).collect();
    let context = context_lines.into_iter().rev().collect::<Vec<&str>>().join("\n");
    
    // Crear prompt optimizado para autocompletado
    let prompt = format!(
        "You are a code completion AI. Complete the {} code at the cursor position.

File: {}
Code:
```{}
{}[CURSOR]{}
```

Complete ONLY what comes immediately after [CURSOR]. Output raw code only, no markdown, no explanations:",
        language, file_path, language, context, after
    );

    // Configurar thinking mode basado en agent_mode
    let (thinking_config, max_tokens) = if agent_mode.unwrap_or(false) {
        println!("🤖 Modo Agent activado con thinking dinámico");
        (
            Some(GeminiThinkingConfig {
                thinking_budget: -1, // Dinámico: el modelo decide cuánto "pensar"
                include_thoughts: true, // Incluir resumen de pensamientos
            }),
            512 // Más tokens cuando thinking está activado
        )
    } else {
        println!("⚡ Modo rápido: thinking desactivado");
        (
            Some(GeminiThinkingConfig {
                thinking_budget: 0, // Sin thinking para completions rápidos
                include_thoughts: false,
            }),
            120 // Tokens normales para autocompletado rápido
        )
    };

    let request_body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart { text: prompt }],
        }],
        generation_config: GeminiGenerationConfig {
            temperature: 0.2,
            max_output_tokens: max_tokens,
            candidate_count: 1,
            thinking_config,
        },
    };

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );
    
    println!("🚀 Llamando a Gemini API...");
    println!("   Modelo: {}", model);
    println!("   URL: {}", url.split("?key=").next().unwrap_or(""));
    
    let client = Client::new();
    
    match client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(8))
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            println!("📡 Status: {}", status);
            
            if response.status().is_success() {
                // Primero obtener el texto para debuggear
                let response_text = response.text().await.map_err(|e| e.to_string())?;
                println!("📦 Respuesta completa: {}", response_text);
                
                // Intentar parsear manualmente
                match serde_json::from_str::<serde_json::Value>(&response_text) {
                    Ok(json) => {
                        println!("✅ JSON parseado correctamente");
                        let mut suggestions = Vec::new();
                        
                        // Navegar por la estructura real de Gemini
                        if let Some(candidates) = json["candidates"].as_array() {
                            println!("✅ Candidatos encontrados: {}", candidates.len());
                            for (i, candidate) in candidates.iter().enumerate() {
                                println!("   📋 Procesando candidato #{}", i + 1);
                                
                                // Ver el finishReason
                                if let Some(finish_reason) = candidate["finishReason"].as_str() {
                                    println!("   🏁 Finish reason: {}", finish_reason);
                                }
                                
                                // Intentar extraer el texto de diferentes formas
                                if let Some(content) = candidate.get("content") {
                                    if let Some(parts) = content["parts"].as_array() {
                                        println!("   ✅ Parts encontrados: {}", parts.len());
                                        for part in parts {
                                            // Detectar si es un "thought" (pensamiento del modelo)
                                            let is_thought = part["thought"].as_bool().unwrap_or(false);
                                            
                                            if let Some(text) = part["text"].as_str() {
                                                if is_thought {
                                                    println!("   💭 Pensamiento del modelo: {}", text);
                                                    // Los pensamientos NO se agregan como sugerencias
                                                    continue;
                                                }
                                                
                                                let cleaned = text.trim()
                                                    .trim_start_matches("```")
                                                    .trim_start_matches(&language)
                                                    .trim_end_matches("```")
                                                    .trim();
                                                
                                                if !cleaned.is_empty() {
                                                    println!("   ✨ Sugerencia: {}", cleaned);
                                                    suggestions.push(cleaned.to_string());
                                                }
                                            }
                                        }
                                    } else {
                                        println!("   ⚠️ No hay 'parts' en content");
                                    }
                                } else {
                                    println!("   ⚠️ No hay 'content' en candidate");
                                }
                            }
                        }
                        
                        if suggestions.is_empty() {
                            println!("⚠️ No se pudieron extraer sugerencias del JSON");
                        }
                        
                        Ok(suggestions)
                    }
                    Err(e) => {
                        eprintln!("❌ Error parsing JSON: {:?}", e);
                        Ok(vec![])
                    }
                }
            } else {
                let error_text = response.text().await.unwrap_or_default();
                eprintln!("❌ Gemini API error {}: {}", status, error_text);
                Ok(vec![])
            }
        }
        Err(e) => {
            eprintln!("❌ Error calling Gemini: {:?}", e);
            Ok(vec![])
        }
    }
}

// Nueva función para procesar prompts directos (Fix, Explain, etc.)
#[tauri::command]
async fn ask_gemini(
    prompt: String,
    api_key: String,
    model: String,
    use_thinking: bool,
) -> Result<String, String> {
    use reqwest::Client;
    
    if api_key.is_empty() {
        return Err("No API key provided".to_string());
    }

    // Configurar thinking mode
    let (thinking_config, max_tokens) = if use_thinking {
        println!("🤖 ask_gemini con thinking activado");
        (
            Some(GeminiThinkingConfig {
                thinking_budget: -1,
                include_thoughts: true,
            }),
            2048 // Más tokens para respuestas completas
        )
    } else {
        println!("⚡ ask_gemini modo rápido");
        (
            Some(GeminiThinkingConfig {
                thinking_budget: 0,
                include_thoughts: false,
            }),
            1024
        )
    };

    let request_body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart { text: prompt }],
        }],
        generation_config: GeminiGenerationConfig {
            temperature: 0.3,
            max_output_tokens: max_tokens,
            candidate_count: 1,
            thinking_config,
        },
    };

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model, api_key
    );
    
    println!("🚀 ask_gemini llamando a Gemini API...");
    println!("   Modelo: {}", model);
    
    let client = Client::new();
    
    match client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            println!("📡 Status: {}", status);
            
            if response.status().is_success() {
                let response_text = response.text().await.map_err(|e| e.to_string())?;
                
                match serde_json::from_str::<serde_json::Value>(&response_text) {
                    Ok(json) => {
                        if let Some(candidates) = json["candidates"].as_array() {
                            if let Some(candidate) = candidates.first() {
                                if let Some(content) = candidate.get("content") {
                                    if let Some(parts) = content["parts"].as_array() {
                                        // Concatenar todas las partes de texto (ignorando thoughts)
                                        let mut result = String::new();
                                        for part in parts {
                                            let is_thought = part["thought"].as_bool().unwrap_or(false);
                                            if !is_thought {
                                                if let Some(text) = part["text"].as_str() {
                                                    result.push_str(text);
                                                }
                                            }
                                        }
                                        
                                        if !result.is_empty() {
                                            println!("✅ Respuesta obtenida: {} caracteres", result.len());
                                            return Ok(result);
                                        }
                                    }
                                }
                            }
                        }
                        Err("No se encontró contenido en la respuesta".to_string())
                    }
                    Err(e) => {
                        eprintln!("❌ Error parsing JSON: {:?}", e);
                        Err(format!("Error parsing response: {}", e))
                    }
                }
            } else {
                let error_text = response.text().await.unwrap_or_default();
                eprintln!("❌ Gemini API error {}: {}", status, error_text);
                Err(format!("API error: {}", error_text))
            }
        }
        Err(e) => {
            eprintln!("❌ Error calling Gemini: {:?}", e);
            Err(format!("Network error: {}", e))
        }
    }
}

// Guardar configuración de Gemini
#[tauri::command]
fn save_gemini_config(api_key: String, model: String, app_data_dir: String, agent_mode: Option<bool>, inline_suggestions_enabled: Option<bool>) -> Result<(), String> {
    // Crear el directorio si no existe
    let dir_path = Path::new(&app_data_dir);
    if !dir_path.exists() {
        fs::create_dir_all(dir_path).map_err(|e| format!("Error creando directorio: {}", e))?;
    }
    
    let config_path = dir_path.join("gemini_config.json");
    
    let config = serde_json::json!({
        "api_key": api_key,
        "model": model,
        "enabled": true,
        "agent_mode": agent_mode.unwrap_or(false),
        "inline_suggestions_enabled": inline_suggestions_enabled.unwrap_or(false)
    });
    
    fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap())
        .map_err(|e| format!("Error guardando archivo: {}", e))?;
    
    Ok(())
}

// Leer configuración de Gemini
#[tauri::command]
fn load_gemini_config(app_data_dir: String) -> Result<String, String> {
    let config_path = Path::new(&app_data_dir).join("gemini_config.json");
    
    if !config_path.exists() {
        return Err("No hay API key configurada".to_string());
    }
    
    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    Ok(content)
}

// ============================================
// ACTIVITY LOG COMMANDS
// ============================================

#[tauri::command]
fn save_activity_log(entry: LogEntry) -> Result<(), String> {
    let mut log_lock = ACTIVITY_LOG.lock().unwrap();
    
    if let Some(log) = log_lock.as_mut() {
        log.add_entry(entry)?;
    }
    
    Ok(())
}

#[tauri::command]
fn get_activity_logs() -> Result<Vec<LogEntry>, String> {
    let log_lock = ACTIVITY_LOG.lock().unwrap();
    
    if let Some(log) = log_lock.as_ref() {
        Ok(log.get_entries().clone())
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
fn clear_activity_log() -> Result<(), String> {
    let mut log_lock = ACTIVITY_LOG.lock().unwrap();
    
    if let Some(log) = log_lock.as_mut() {
        log.clear()?;
    }
    
    Ok(())
}

// ============================================
// BACKUP COMMANDS
// ============================================

#[tauri::command]
fn create_backup(
    name: Option<String>,
    description: Option<String>,
    backup_type: String,
) -> Result<Backup, String> {
    let mut manager_lock = BACKUP_MANAGER.lock().unwrap();
    
    if let Some(manager) = manager_lock.as_mut() {
        // Obtener el proyecto actual (esto debería venir de un estado global)
        let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
        manager.create_backup(&current_dir, name, description, &backup_type)
    } else {
        Err("Backup manager no inicializado".to_string())
    }
}

#[tauri::command]
fn get_backups() -> Result<Vec<Backup>, String> {
    let manager_lock = BACKUP_MANAGER.lock().unwrap();
    
    if let Some(manager) = manager_lock.as_ref() {
        Ok(manager.get_backups())
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
fn restore_backup(backup_id: String) -> Result<(), String> {
    let manager_lock = BACKUP_MANAGER.lock().unwrap();
    
    if let Some(manager) = manager_lock.as_ref() {
        manager.restore_backup(&backup_id)
    } else {
        Err("Backup manager no inicializado".to_string())
    }
}

#[tauri::command]
fn delete_backup(backup_id: String) -> Result<(), String> {
    let mut manager_lock = BACKUP_MANAGER.lock().unwrap();
    
    if let Some(manager) = manager_lock.as_mut() {
        manager.delete_backup(&backup_id)
    } else {
        Err("Backup manager no inicializado".to_string())
    }
}

#[tauri::command]
fn compare_backup(backup_id: String) -> Result<(String, String), String> {
    let manager_lock = BACKUP_MANAGER.lock().unwrap();
    
    if let Some(manager) = manager_lock.as_ref() {
        let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
        manager.compare_backup(&backup_id, &current_dir)
    } else {
        Err("Backup manager no inicializado".to_string())
    }
}

// ============================================
// DIAGNOSTICS COMMANDS
// ============================================

#[tauri::command]
fn get_diagnostics() -> Result<Vec<DiagnosticError>, String> {
    let diagnostics_lock = DIAGNOSTICS.lock().unwrap();
    
    if let Some(diagnostics) = diagnostics_lock.as_ref() {
        Ok(diagnostics.get_errors().clone())
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
fn analyze_file_diagnostics(file_path: String, content: String) -> Result<(), String> {
    let mut diagnostics_lock = DIAGNOSTICS.lock().unwrap();
    
    if let Some(diagnostics) = diagnostics_lock.as_mut() {
        diagnostics.analyze_file(&file_path, &content);
    }
    
    Ok(())
}

#[tauri::command]
fn clear_file_diagnostics(file_path: String) -> Result<(), String> {
    let mut diagnostics_lock = DIAGNOSTICS.lock().unwrap();
    
    if let Some(diagnostics) = diagnostics_lock.as_mut() {
        diagnostics.clear_file_errors(&file_path);
    }
    
    Ok(())
}

#[tauri::command]
fn apply_quick_fix(error: DiagnosticError) -> Result<(), String> {
    // Implementar lógica de quick fixes
    println!("Aplicando fix para error: {:?}", error);
    Ok(())
}

// Inicializar managers al inicio
#[tauri::command]
fn init_managers(app_data_dir: String) -> Result<(), String> {
    let app_dir = Path::new(&app_data_dir);
    
    // Inicializar Activity Log
    let activity_log = ActivityLog::new(app_dir)?;
    *ACTIVITY_LOG.lock().unwrap() = Some(activity_log);
    
    // Inicializar Backup Manager
    let backup_manager = BackupManager::new(app_dir)?;
    *BACKUP_MANAGER.lock().unwrap() = Some(backup_manager);
    
    // Inicializar Diagnostics
    let diagnostics = DiagnosticsManager::new();
    *DIAGNOSTICS.lock().unwrap() = Some(diagnostics);
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            validate_project_path,
            get_project_root,
            scan_commands,
            scan_events,
            get_project_stats,
            read_file_content,
            write_file_content,
            scan_all_files,
            init_discord_rpc,
            update_discord_rpc,
            disconnect_discord_rpc,
            create_file,
            create_folder,
            delete_file,
            delete_folder,
            rename_file,
            prisma_db_push,
            prisma_db_pull,
            read_env_file,
            write_env_file,
            scan_env_variables,
            scan_env_variables_with_locations,
            get_package_scripts,
            get_gemini_completion,
            ask_gemini,
            save_gemini_config,
            load_gemini_config,
            // Nuevos comandos
            init_managers,
            save_activity_log,
            get_activity_logs,
            clear_activity_log,
            create_backup,
            get_backups,
            restore_backup,
            delete_backup,
            compare_backup,
            get_diagnostics,
            analyze_file_diagnostics,
            clear_file_diagnostics,
            apply_quick_fix
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
