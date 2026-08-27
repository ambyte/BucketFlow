<template>
  <div
    class="flex items-center gap-0.5"
    @click.stop
  >
    <UTooltip
      v-if="!item.isFolder && showMetadata"
      text="Metadata"
    >
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-heroicons-tag"
        size="md"
        class="cursor-pointer"
        aria-label="Metadata"
        @click="emit('metadata', item as FileItem)"
      />
    </UTooltip>

    <UTooltip
      v-if="isEditor"
      text="Rename"
    >
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-heroicons-pencil-square"
        size="md"
        class="cursor-pointer"
        aria-label="Rename"
        @click="onRename"
      />
    </UTooltip>

    <UTooltip text="Download">
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-heroicons-arrow-down-tray"
        size="md"
        class="cursor-pointer"
        aria-label="Download"
        @click="onDownload"
      />
    </UTooltip>

    <UTooltip
      v-if="!item.isFolder && canPreview(item as FileItem)"
      text="Preview"
    >
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-heroicons-eye"
        size="md"
        class="cursor-pointer"
        aria-label="Preview"
        @click="emit('preview', item as FileItem)"
      />
    </UTooltip>

    <UTooltip
      v-if="isEditor"
      text="Delete"
    >
      <UButton
        variant="ghost"
        color="error"
        icon="i-heroicons-trash"
        size="md"
        class="cursor-pointer"
        aria-label="Delete"
        @click="onDelete"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import type { FileItem, TableRow } from '../../types'
import { canPreview } from '../../utils/fileUtils'

const props = withDefaults(defineProps<{
  item: TableRow
  isEditor?: boolean
  showMetadata?: boolean
}>(), {
  isEditor: false,
  showMetadata: false
})

const emit = defineEmits<{
  download: [file: FileItem]
  preview: [file: FileItem]
  delete: [file: FileItem]
  deleteFolder: [folder: { name: string, Prefix: string }]
  downloadFolder: [folder: { name: string, Prefix: string }]
  renameFolder: [folder: { name: string, Prefix: string }]
  renameFile: [file: FileItem]
  metadata: [file: FileItem]
}>()

function folderPayload() {
  return {
    name: props.item.name,
    Prefix: props.item.Prefix || ''
  }
}

function onRename() {
  if (props.item.isFolder) {
    emit('renameFolder', folderPayload())
    return
  }
  emit('renameFile', props.item as FileItem)
}

function onDownload() {
  if (props.item.isFolder) {
    emit('downloadFolder', folderPayload())
    return
  }
  emit('download', props.item as FileItem)
}

function onDelete() {
  if (props.item.isFolder) {
    emit('deleteFolder', folderPayload())
    return
  }
  emit('delete', props.item as FileItem)
}
</script>
