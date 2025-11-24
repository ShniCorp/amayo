# Script para convertir createDisplayComponent.ts a v14
$file = "src/commands/messages/alliaces/createDisplayComponent.ts"
$content = Get-Content $file -Raw

# 1. Agregar imports
$importSection = @"
import type { DisplayComponentContainer } from "../../../core/types/displayComponents";
import { hasManageGuildOrStaff } from "../../../core/lib/permissions";
// v14-compatible modal builders
import {
  createTitleModal,
  createDescriptionModal,
  createColorModal,
  createTextContentModal,
  createImageUrlModal,
} from "../../../core/lib/displayComponents";
"@

$content = $content -replace 'import type \{ DisplayComponentContainer \} from "\.\.\/\.\.\/\.\.\/core\/types\/displayComponents";\r?\nimport \{ hasManageGuildOrStaff \} from "\.\.\/\.\.\/\.\.\/core\/lib\/permissions";', $importSection

# 2. Comentar función createModal vieja
$oldCreateModal = 'type ModalField[\s\S]*?} as const;\r?\n}'
$newCreateModal = @"
// OLD v15-dev createModal() - DISABLED
/* type ModalField = {
  customId: string; style: number; placeholder?: string; value?: string;
  required?: boolean; maxLength?: number; label?: string;
};
function createModal(params: { title: string; customId: string; fields: ModalField[]; }) {
  const components = params.fields.map((f) => ({ type: ComponentType.Label, label: f.label ?? "", component: { type: ComponentType.TextInput, customId: f.customId, style: f.style, placeholder: f.placeholder, value: f.value, required: f.required ?? false, maxLength: f.maxLength, }, }));
  return { title: params.title, customId: params.customId, components, } as const;
} */
"@

$content = $content -replace $oldCreateModal, $newCreateModal

# 3. Reemplazar modal de thumbnail (línea ~469)
$content = $content -replace 'const modal = createModal\(\{\s+title: "📎 Editar Thumbnail",\s+customId: `edit_thumbnail_modal_\$\{idx\}`,\s+fields: \[\s+\{\s+customId: "thumbnail_input",[\s\S]*?\}\s+\],\s+\}\);', 'const modal = createImageUrlModal({ customId: `edit_thumbnail_modal_${idx}`, currentUrl: textComp.thumbnail || "", title: "📎 Editar Thumbnail", });'

# 4. Reemplazar extractors thumbnail_input -> image_input
$content = $content -replace '\.components\.getTextInputValue\("thumbnail_input"\)', '.fields.getTextInputValue("image_input")'

# 5. Reemplazar modal de title (línea ~793)
$content = $content -replace 'const modal = createModal\(\{\s+title: "Editar Título del Bloque",\s+customId: "edit_title_modal",\s+fields: \[\s+\{\s+customId: "title_input",[\s\S]*?\}\s+\],\s+\}\);', 'const modal = createTitleModal({ customId: "edit_title_modal", currentTitle: blockState.title || "", });'

# 6. Reemplazar modal de image (línea ~1150)
$content = $content -replace 'const modal = createModal\(\{\s+title: "Añadir Imagen",\s+customId: "add_image_modal",\s+fields: \[\s+\{\s+customId: "image_input",[\s\S]*?\}\s+\],\s+\}\);', 'const modal = createImageUrlModal({ customId: "add_image_modal", title: "🖼️ Añadir Imagen", });'

# 7. Reemplazar .components.getTextInputValue por .fields.getTextInputValue
$content = $content -replace '\.components\.getTextInputValue\(', '.fields.getTextInputValue('

# 8. Remover (as any) de showModal
$content = $content -replace 'await interaction\.showModal\(modal as any\);', 'await interaction.showModal(modal);'
$content = $content -replace 'await sel\.showModal\(modal as any\);', 'await sel.showModal(modal);'

# Guardar
Set-Content -Path $file -Value $content -NoNewline
Write-Host "✅ Archivo convertido exitosamente"
