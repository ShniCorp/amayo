# Script v4 - Reemplazar los 3 modals exactos que quedaron
$file = "src/commands/messages/alliaces/createDisplayComponent.ts"
$content = Get-Content $file -Raw

# 1. handleEditColor (líneas 857-877) - EXACTO
$oldColorModal = @'
  const modal = {
    title: "Editar Color del Bloque",
    customId: "edit_color_modal",
    components: [
      {
        type: ComponentType.Label,
        label: "Color (formato HEX)",
        component: {
          type: ComponentType.TextInput,
          customId: "color_input",
          style: TextInputStyle.Short,
          required: false,
          placeholder: "#FF5733 o FF5733",
          value: blockState.color
            ? `#${blockState.color.toString(16).padStart(6, "0")}`
            : "",
          maxLength: 7,
        },
      },
    ],
  } as const;
'@

$newColorModal = @'
  const modal = createColorModal({
    customId: "edit_color_modal",
    currentColor: blockState.color
      ? `#${blockState.color.toString(16).padStart(6, "0")}`
      : "",
  });
'@

$content = $content.Replace($oldColorModal, $newColorModal)

# 2. handleAddContent (líneas 951-968) - EXACTO
$oldContentModal = @'
  const modal = {
    title: "Añadir Contenido de Texto",
    customId: "add_content_modal",
    components: [
      {
        type: ComponentType.Label,
        label: "Contenido",
        component: {
          type: ComponentType.TextInput,
          customId: "content_input",
          style: TextInputStyle.Paragraph,
          required: true,
          placeholder: "Escribe el contenido de texto...",
          maxLength: 4000,
        },
      },
    ],
  } as const;
'@

$newContentModal = @'
  const modal = createTextContentModal({
    customId: "add_content_modal",
  });
'@

$content = $content.Replace($oldContentModal, $newContentModal)

# 3. handleCoverImage (líneas 1130-1148) - EXACTO
$oldCoverModal = @'
  const modal = {
    title: "Imagen de Portada",
    customId: "cover_image_modal",
    components: [
      {
        type: ComponentType.Label,
        label: "URL de la Imagen de Portada",
        component: {
          type: ComponentType.TextInput,
          customId: "cover_input",
          style: TextInputStyle.Short,
          required: false,
          placeholder: "https://ejemplo.com/portada.png",
          value: blockState.coverImage || "",
          maxLength: 512,
        },
      },
    ],
  } as const;
'@

$newCoverModal = @'
  const modal = createImageUrlModal({
    customId: "cover_image_modal",
    title: "🖼️ Imagen de Portada",
    currentUrl: blockState.coverImage || "",
  });
'@

$content = $content.Replace($oldCoverModal, $newCoverModal)

# Guardar
Set-Content -Path $file -Value $content -NoNewline
Write-Host "✅ Últimos 3 modals convertidos v4"
