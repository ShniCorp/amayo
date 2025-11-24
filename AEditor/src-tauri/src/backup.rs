use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use sha2::{Sha256, Digest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupFile {
    pub path: String,
    pub content: String,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Backup {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub timestamp: u64,
    #[serde(rename = "type")]
    pub backup_type: String,
    pub file_count: usize,
    pub size: usize,
    pub files: Vec<BackupFile>,
}

pub struct BackupManager {
    backups_dir: PathBuf,
    backups: HashMap<String, Backup>,
}

impl BackupManager {
    pub fn new(app_dir: &Path) -> Result<Self, String> {
        let backups_dir = app_dir.join("backups");
        fs::create_dir_all(&backups_dir)
            .map_err(|e| format!("Failed to create backups directory: {}", e))?;

        let mut manager = BackupManager {
            backups_dir,
            backups: HashMap::new(),
        };

        manager.load_backups()?;
        Ok(manager)
    }

    fn load_backups(&mut self) -> Result<(), String> {
        let entries = fs::read_dir(&self.backups_dir)
            .map_err(|e| format!("Failed to read backups directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let content = fs::read_to_string(&path)
                    .map_err(|e| format!("Failed to read backup file: {}", e))?;

                let backup: Backup = serde_json::from_str(&content)
                    .map_err(|e| format!("Failed to parse backup: {}", e))?;

                self.backups.insert(backup.id.clone(), backup);
            }
        }

        Ok(())
    }

    pub fn create_backup(
        &mut self,
        project_path: &Path,
        name: Option<String>,
        description: Option<String>,
        backup_type: &str,
    ) -> Result<Backup, String> {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let id = format!("backup_{}", timestamp);
        let mut files = Vec::new();
        let mut total_size = 0;

        // Recopilar archivos del proyecto
        self.collect_files(project_path, &mut files, &mut total_size)?;

        let backup = Backup {
            id: id.clone(),
            name,
            description,
            timestamp,
            backup_type: backup_type.to_string(),
            file_count: files.len(),
            size: total_size,
            files,
        };

        // Guardar backup en disco
        let backup_path = self.backups_dir.join(format!("{}.json", id));
        let backup_json = serde_json::to_string_pretty(&backup)
            .map_err(|e| format!("Failed to serialize backup: {}", e))?;

        fs::write(&backup_path, backup_json)
            .map_err(|e| format!("Failed to write backup file: {}", e))?;

        self.backups.insert(id.clone(), backup.clone());

        Ok(backup)
    }

    fn collect_files(
        &self,
        dir: &Path,
        files: &mut Vec<BackupFile>,
        total_size: &mut usize,
    ) -> Result<(), String> {
        let entries = fs::read_dir(dir)
            .map_err(|e| format!("Failed to read directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();

            // Ignorar directorios comunes
            let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            if file_name.starts_with('.') || 
               file_name == "node_modules" || 
               file_name == "target" ||
               file_name == "dist" ||
               file_name == "build" {
                continue;
            }

            if path.is_file() {
                if let Ok(content) = fs::read_to_string(&path) {
                    let mut hasher = Sha256::new();
                    hasher.update(&content);
                    let hash = format!("{:x}", hasher.finalize());

                    *total_size += content.len();

                    files.push(BackupFile {
                        path: path.display().to_string(),
                        content,
                        hash,
                    });
                }
            } else if path.is_dir() {
                self.collect_files(&path, files, total_size)?;
            }
        }

        Ok(())
    }

    pub fn restore_backup(&self, backup_id: &str) -> Result<(), String> {
        let backup = self.backups
            .get(backup_id)
            .ok_or_else(|| format!("Backup not found: {}", backup_id))?;

        for file in &backup.files {
            let file_path = Path::new(&file.path);
            
            // Crear directorio padre si no existe
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            }

            fs::write(file_path, &file.content)
                .map_err(|e| format!("Failed to restore file: {}", e))?;
        }

        Ok(())
    }

    pub fn delete_backup(&mut self, backup_id: &str) -> Result<(), String> {
        self.backups.remove(backup_id)
            .ok_or_else(|| format!("Backup not found: {}", backup_id))?;

        let backup_path = self.backups_dir.join(format!("{}.json", backup_id));
        fs::remove_file(&backup_path)
            .map_err(|e| format!("Failed to delete backup file: {}", e))?;

        Ok(())
    }

    pub fn get_backups(&self) -> Vec<Backup> {
        self.backups.values().cloned().collect()
    }

    pub fn compare_backup(&self, backup_id: &str, current_path: &Path) -> Result<(String, String), String> {
        let backup = self.backups
            .get(backup_id)
            .ok_or_else(|| format!("Backup not found: {}", backup_id))?;

        // Obtener primer archivo del backup para comparar
        let backup_file = backup.files.first()
            .ok_or_else(|| "Backup has no files".to_string())?;

        let current_content = fs::read_to_string(current_path)
            .unwrap_or_else(|_| String::from("File not found"));

        Ok((current_content, backup_file.content.clone()))
    }
}
