use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticError {
    pub id: String,
    pub severity: String,
    pub message: String,
    pub file: String,
    pub line: usize,
    pub column: usize,
    pub code: Option<String>,
    pub suggestion: Option<String>,
    pub fixable: Option<bool>,
    pub source: Option<String>,
}

pub struct DiagnosticsManager {
    errors: Vec<DiagnosticError>,
}

impl DiagnosticsManager {
    pub fn new() -> Self {
        DiagnosticsManager {
            errors: Vec::new(),
        }
    }

    pub fn add_error(&mut self, error: DiagnosticError) {
        // Evitar duplicados
        if !self.errors.iter().any(|e| {
            e.file == error.file &&
            e.line == error.line &&
            e.column == error.column &&
            e.message == error.message
        }) {
            self.errors.push(error);
        }
    }

    pub fn clear_file_errors(&mut self, file_path: &str) {
        self.errors.retain(|e| e.file != file_path);
    }

    pub fn get_errors(&self) -> &Vec<DiagnosticError> {
        &self.errors
    }

    pub fn clear(&mut self) {
        self.errors.clear();
    }

    // Análisis básico de errores comunes de JavaScript/TypeScript
    pub fn analyze_file(&mut self, file_path: &str, content: &str) {
        self.clear_file_errors(file_path);

        let lines: Vec<&str> = content.lines().collect();

        for (line_num, line) in lines.iter().enumerate() {
            let line_number = line_num + 1;

            // Detectar console.log (warning)
            if line.contains("console.log") {
                self.add_error(DiagnosticError {
                    id: format!("{}-{}-console", file_path, line_number),
                    severity: "warning".to_string(),
                    message: "Uso de console.log() detectado".to_string(),
                    file: file_path.to_string(),
                    line: line_number,
                    column: line.find("console.log").unwrap_or(0) + 1,
                    code: Some("no-console".to_string()),
                    suggestion: Some("Considera usar un logger apropiado".to_string()),
                    fixable: Some(true),
                    source: Some("aeditor".to_string()),
                });
            }

            // Detectar var (warning)
            if line.trim_start().starts_with("var ") {
                self.add_error(DiagnosticError {
                    id: format!("{}-{}-var", file_path, line_number),
                    severity: "warning".to_string(),
                    message: "Uso de 'var' está desaconsejado".to_string(),
                    file: file_path.to_string(),
                    line: line_number,
                    column: line.find("var").unwrap_or(0) + 1,
                    code: Some("no-var".to_string()),
                    suggestion: Some("Usa 'const' o 'let' en su lugar".to_string()),
                    fixable: Some(true),
                    source: Some("aeditor".to_string()),
                });
            }

            // Detectar == en lugar de === (warning)
            if line.contains(" == ") && !line.contains("===") {
                self.add_error(DiagnosticError {
                    id: format!("{}-{}-eqeq", file_path, line_number),
                    severity: "warning".to_string(),
                    message: "Usa '===' en lugar de '=='".to_string(),
                    file: file_path.to_string(),
                    line: line_number,
                    column: line.find(" == ").unwrap_or(0) + 1,
                    code: Some("eqeqeq".to_string()),
                    suggestion: Some("Usa '===' para comparación estricta".to_string()),
                    fixable: Some(true),
                    source: Some("aeditor".to_string()),
                });
            }

            // Detectar funciones sin punto y coma (info)
            if line.trim().ends_with(")") && !line.trim().ends_with(";") && !line.trim().ends_with("{") {
                self.add_error(DiagnosticError {
                    id: format!("{}-{}-semi", file_path, line_number),
                    severity: "info".to_string(),
                    message: "Falta punto y coma".to_string(),
                    file: file_path.to_string(),
                    line: line_number,
                    column: line.len(),
                    code: Some("semi".to_string()),
                    suggestion: None,
                    fixable: Some(true),
                    source: Some("aeditor".to_string()),
                });
            }

            // Detectar TODO/FIXME comments (info)
            if line.contains("TODO") || line.contains("FIXME") {
                self.add_error(DiagnosticError {
                    id: format!("{}-{}-todo", file_path, line_number),
                    severity: "info".to_string(),
                    message: "Comentario TODO pendiente".to_string(),
                    file: file_path.to_string(),
                    line: line_number,
                    column: line.find("TODO").or_else(|| line.find("FIXME")).unwrap_or(0) + 1,
                    code: Some("no-warning-comments".to_string()),
                    suggestion: None,
                    fixable: Some(false),
                    source: Some("aeditor".to_string()),
                });
            }
        }
    }
}
