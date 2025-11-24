# Script v2 para convertir createDisplayComponent.ts a v14
$file = "src/commands/messages/alliaces/createDisplayComponent.ts"
$content = Get-Content $file -Raw

# 1. Reemplazar modal de thumbnail (líneas 441-456) - con regex más simple
$content = $content -replace '(?s)const modal = createModal\(\{\s+title: "📎 Editar Thumbnail",\s+customId: `edit_thumbnail_modal_\$\{idx\}`,\s+fields: \[.+?\],\s+\}\);', 'const modal = createImageUrlModal({ customId: `edit_thumbnail_modal_${idx}`, currentUrl: textComp.thumbnail || "", title: "📎 Editar Thumbnail", });'

# 2. Reemplazar extractor de thumbnail_input a image_input (línea 471-472)
$content = $content -replace 'const rawInput = modalInteraction\.components\s+\.getTextInputValue\("thumbnail_input"\)', 'const thumbnailUrl = modalInteraction.fields.getTextInputValue("image_input")'
$content = $content -replace 'rawInput', 'thumbnailUrl'

# 3. Reemplazar modal de title (líneas 765-779)
$content = $content -replace '(?s)const modal = createModal\(\{\s+title: "Editar Título del Bloque",\s+customId: "edit_title_modal",\s+fields: \[.+?\],\s+\}\);', 'const modal = createTitleModal({ customId: "edit_title_modal", currentTitle: blockState.title || "", });'

# 4. Reemplazar extractor de title (línea 788-790)
$content = $content -replace 'const newTitle = modalInteraction\.components\s+\.getTextInputValue\("title_input"\)', 'const newTitle = modalInteraction.fields.getTextInputValue("title_input")'

# 5. Reemplazar el modal de description que quedó - buscar por "as const" pattern
$content = $content -replace '(?s)const modal = \{[\s\S]+?customId: "edit_description_modal",[\s\S]+?\} as const;', 'const modal = createDescriptionModal({ customId: "edit_description_modal", currentDescription: blockState.description || "", });'

# 6. El extractor description ya está correcto (.fields), verificar

# Guardar
Set-Content -Path $file -Value $content -NoNewline
Write-Host "✅ Archivo convertido exitosamente v2"
