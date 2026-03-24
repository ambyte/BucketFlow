<template>
  <div class="flex flex-wrap gap-2">
    <div
      v-for="row in data"
      :key="row.name"
      class="flex flex-col
      items-center p-2 py-4 hover:bg-elevated rounded-lg transition-colors group relative"
      :class="gridClasses"
    >
      <div class="absolute top-1 left-1 z-10" @click.stop>
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
          :name="row.isFolder ? 'i-heroicons-folder' : getFileIcon(row as FileItem)
          "
          class="w-12 h-12"
          :class="row.isFolder ? 'text-primary' : 'text-muted'"
        />
        <span class="text-sm text-center truncate w-full text-highlighted">{{
          row.name
        }}</span>
        <div
          v-if="!row.isFolder"
          class="text-xs text-muted"
        >
          {{ formatFileSize(row.Size) }}
        </div>
      </button>
      <div class="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <template v-if="row.isFolder">
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
              @click.stop="
                $emit('renameFolder', {
                  name: row.name,
                  Prefix: (row as any).Prefix
                })
              "
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
              @click.stop="
                $emit('deleteFolder', {
                  name: row.name,
                  Prefix: (row as any).Prefix
                })
              "
            />
          </UTooltip>
        </template>
        <template v-else>
          <UTooltip text="Metadata">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-tag"
              size="md"
              class="cursor-pointer"
              @click.stop="$emit('metadata', row as FileItem)"
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
              @click.stop="$emit('renameFile', row as FileItem)"
            />
          </UTooltip>
          <UTooltip text="Download">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-arrow-down-tray"
              size="md"
              class="cursor-pointer"
              @click.stop="$emit('download', row as FileItem)"
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
              @click.stop="$emit('delete', row as FileItem)"
            />
          </UTooltip>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileItem, TableRow } from '../../types'
import { getFileIcon, formatFileSize } from '../../utils/fileUtils'
import { getGridItemClasses } from '../../utils/gridConfig'

defineProps<{
  data: TableRow[]
  isEditor: boolean
  selectedIds: string[]
}>()

defineEmits<{
  select: [item: TableRow]
  doubleClick: [item: TableRow]
  download: [file: FileItem]
  delete: [file: FileItem]
  deleteFolder: [folder: { name: string, Prefix: string }]
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

const gridClasses = getGridItemClasses()
</script>
