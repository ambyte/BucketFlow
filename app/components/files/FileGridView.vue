<template>
  <div
    :class="gridContainerClasses"
    :style="gridContainerStyle"
  >
    <div
      v-for="row in data"
      :key="row.name"
      :class="gridClasses"
    >
      <div
        class="flex flex-col items-center p-2 py-4 hover:bg-elevated rounded-lg transition-colors group relative w-full"
      >
        <div
          class="absolute top-1 left-1 z-10"
          @click.stop
        >
          <UCheckbox
            :model-value="selectedIds.includes(rowId(row))"
            @update:model-value="$emit('toggleSelect', row)"
          />
        </div>
        <button
          class="flex flex-col items-center w-full"
          @click="$emit('select', row)"
          @dblclick="$emit('doubleClick', row)"
        >
          <UIcon
            :name="row.isFolder ? 'i-heroicons-folder' : getFileIcon(row as FileItem)"
            class="w-12 h-12"
            :class="row.isFolder ? 'text-primary' : 'text-muted'"
          />
          <UTooltip
            :text="row.name"
            :content="{ side: 'top', sideOffset: 8 }"
            :ui="{ content: 'max-w-xs break-all' }"
          >
            <span class="text-sm text-center truncate w-full text-highlighted">{{
              row.name
            }}</span>
          </UTooltip>
          <div
            v-if="row.Size != null"
            class="text-xs text-muted"
          >
            {{ formatFileSize(row.Size) }}
          </div>
        </button>
        <FileRowActions
          class="mt-2 justify-center"
          :class="iconActions ? undefined : 'opacity-0 group-hover:opacity-100 transition-opacity'"
          :item="row"
          :is-editor="isEditor"
          :show-metadata="showMetadata"
          @download="$emit('download', $event)"
          @preview="$emit('preview', $event)"
          @delete="$emit('delete', $event)"
          @delete-folder="$emit('deleteFolder', $event)"
          @download-folder="$emit('downloadFolder', $event)"
          @rename-folder="$emit('renameFolder', $event)"
          @rename-file="$emit('renameFile', $event)"
          @metadata="$emit('metadata', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileItem, TableRow } from '../../types'
import { getFileIcon, formatFileSize } from '../../utils/fileUtils'
import { getGridContainerClasses, getGridContainerStyle, getGridItemClasses } from '../../utils/gridConfig'

withDefaults(defineProps<{
  data: TableRow[]
  isEditor: boolean
  showMetadata?: boolean
  iconActions?: boolean
  selectedIds: string[]
}>(), {
  showMetadata: true,
  iconActions: false
})

defineEmits<{
  select: [item: TableRow]
  doubleClick: [item: TableRow]
  download: [file: FileItem]
  preview: [file: FileItem]
  delete: [file: FileItem]
  deleteFolder: [folder: { name: string, Prefix: string }]
  downloadFolder: [folder: { name: string, Prefix: string }]
  renameFolder: [folder: { name: string, Prefix: string }]
  renameFile: [file: FileItem]
  metadata: [file: FileItem]
  toggleSelect: [item: TableRow]
}>()

function rowId(item: TableRow): string {
  if (item.isFolder) {
    return item.Prefix ?? ''
  }
  return item.Key ?? ''
}

const gridContainerClasses = getGridContainerClasses()
const gridContainerStyle = getGridContainerStyle()
const gridClasses = getGridItemClasses()
</script>
