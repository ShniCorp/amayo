# Script v3 - FINAL para modals restantes
$file = "src/commands/messages/alliaces/createDisplayComponent.ts"
$content = Get-Content $file -Raw

# 1. Modal de color (líneas ~850-877) - objeto con "as const"
$content = $content -replace '(?s)const modal = \{\s+title: "Editar Color",[\s\S]+?customId: "edit_color",[\s\S]+?\} as const;', 'const modal = createColorModal({ customId: "edit_color", currentColor: blockState.color ? `#${blockState.color.toString(16).padStart(6, "0")}` : "", });'

# 2. Extractor color_input
$content = $content -replace 'const colorValue = modalInteraction\.components\s+\.getTextInputValue\("color_input"\)', 'const colorValue = modalInteraction.fields.getTextInputValue("color_input")'

# 3. Modal de addContent (líneas ~950-969) - objeto con "as const"
$content = $content -replace '(?s)const modal = \{\s+title: "Añadir Contenido",[\s\S]+?customId: "add_content",[\s\S]+?\} as const;', 'const modal = createTextContentModal({ customId: "add_content", });'

# 4. Extractor content_input
$content = $content -replace 'const content = modalInteraction\.components\s+\.getTextInputValue\("content_input"\)', 'const content = modalInteraction.fields.getTextInputValue("content_input")'

# 5. Modal de addImage (líneas 1073-1086)
$content = $content -replace '(?s)const modal = createModal\(\{\s+title: "Añadir Imagen",\s+customId: "add_image_modal",\s+fields: \[[\s\S]+?\],\s+\}\);', 'const modal = createImageUrlModal({ customId: "add_image_modal", title: "🖼️ Añadir Imagen", });'

# 6. Extractor image_input para addImage
$content = $content -replace 'const imageUrl = modalInteraction\.components\s+\.getTextInputValue\("image_input"\)', 'const imageUrl = modalInteraction.fields.getTextInputValue("image_input")'

# 7. Modal de coverImage (líneas ~1145-1164) - objeto con "as const"
$content = $content -replace '(?s)const modal = \{\s+title: "Imagen de Portada",[\s\S]+?customId: "cover_image",[\s\S]+?\} as const;', 'const modal = createImageUrlModal({ customId: "cover_image", title: "🖼️ Imagen de Portada", currentUrl: blockState.coverImage || "", });'

# 8. Extractor cover_input -> image_input
$content = $content -replace 'const coverUrl = modalInteraction\.components\s+\.getTextInputValue\("cover_input"\)', 'const coverUrl = modalInteraction.fields.getTextInputValue("image_input")'

# Guardar
Set-Content -Path $file -Value $content -NoNewline
Write-Host "✅ Modals restantes convertidos v3"
