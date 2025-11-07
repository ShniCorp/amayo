use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    pub action: String,
    pub file: String,
    pub timestamp: u64,
    pub lines: Option<usize>,
    pub details: Option<String>,
    pub user: Option<String>,
    pub diff: Option<String>,
}

pub struct ActivityLog {
    log_file: PathBuf,
    entries: Vec<LogEntry>,
}

impl ActivityLog {
    pub fn new(app_dir: &Path) -> Result<Self, String> {
        let log_file = app_dir.join("activity_log.json");
        
        let entries = if log_file.exists() {
            let content = fs::read_to_string(&log_file)
                .map_err(|e| format!("Failed to read log file: {}", e))?;
            
            serde_json::from_str(&content)
                .unwrap_or_else(|_| Vec::new())
        } else {
            Vec::new()
        };

        Ok(ActivityLog { log_file, entries })
    }

    pub fn add_entry(&mut self, entry: LogEntry) -> Result<(), String> {
        self.entries.insert(0, entry);
        
        // Limitar a 1000 entradas
        if self.entries.len() > 1000 {
            self.entries.truncate(1000);
        }
        
        self.save()?;
        Ok(())
    }

    pub fn get_entries(&self) -> &Vec<LogEntry> {
        &self.entries
    }

    pub fn clear(&mut self) -> Result<(), String> {
        self.entries.clear();
        self.save()?;
        Ok(())
    }

    fn save(&self) -> Result<(), String> {
        let json = serde_json::to_string_pretty(&self.entries)
            .map_err(|e| format!("Failed to serialize log: {}", e))?;
        
        fs::write(&self.log_file, json)
            .map_err(|e| format!("Failed to write log file: {}", e))?;
        
        Ok(())
    }
}
