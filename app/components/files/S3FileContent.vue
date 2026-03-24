<template>
  <div class="flex-1 overflow-y-auto p-4">
    <!-- Empty State: No Identifier -->
    <div
      v-if="!hasIdentifier || !selectedBucketName"
      class="flex items-center justify-center h-full"
    >
      <div class="text-center">
        <UIcon
          name="i-heroicons-server"
          class="w-16 h-16 mx-auto mb-4 text-muted"
        />
        <p class="text-muted">
          Select destination and bucket to start
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-else-if="isLoading"
      class="flex items-center justify-center h-full"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary"
      />
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list' && tableRows.length > 0">
      <S3FileTable
        :data="tableRows"
        :is-editor="isEditor"
        :show-metadata="!isPublicMode && isEditor"
        :metadata-columns="metadataColumns"
        :selected-ids="selectedIds"
        :select-all-checkbox-value="selectAllCheckboxValue"
        @select="handleSelect"
        @double-click="handleDoubleClick"
        @download="handleDownload"
        @preview="handlePreview"
        @delete="handleDelete"
        @delete-folder="handleDeleteFolder"
        @download-folder="handleDownloadFolder"
        @rename-folder="handleRenameFolder"
        @rename-file="handleRenameFile"
        @metadata="handleMetadata"
        @toggle-select="handleToggleSelect"
        @toggle-select-all="handleToggleSelectAll"
      />
    </div>

    <!-- Grid View -->
    <FileGridView
      v-else-if="viewMode === 'grid' && tableRows.length > 0"
      :data="tableRows"
      :is-editor="isEditor"
      :selected-ids="selectedIds"
      @select="handleSelect"
      @double-click="handleDoubleClick"
      @download="handleDownload"
      @delete="handleDelete"
      @delete-folder="handleDeleteFolder"
      @rename-folder="handleRenameFolder"
      @rename-file="handleRenameFile"
      @metadata="handleMetadata"
      @toggle-select="handleToggleSelect"
    />

    <!-- Empty State: Empty Folder -->
    <div
      v-else-if="tableRows.length === 0 && !isLoading"
      class="flex items-center justify-center h-full"
    >
      <div class="text-center">
        <UIcon
          name="i-heroicons-folder-open"
          class="w-16 h-16 mx-auto mb-4 text-muted"
        />
        <p class="text-muted">
          This folder is empty
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileItem, TableRow } from '../../types'

interface Props {
  hasIdentifier: boolean
  selectedBucketName?: string
  isLoading: boolean
  viewMode: 'grid' | 'list'
  tableRows: TableRow[]
  isEditor: boolean
  isPublicMode: boolean
  metadataColumns: string[]
  selectedIds: string[]
  selectAllCheckboxValue: boolean | 'indeterminate'
}

defineProps<Props>()

const emit = defineEmits<{
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
  toggleSelectAll: []
}>()

const handleSelect = (item: TableRow) => emit('select', item)
const handleDoubleClick = (item: TableRow) => emit('doubleClick', item)
const handleToggleSelect = (item: TableRow) => emit('toggleSelect', item)
const handleToggleSelectAll = () => emit('toggleSelectAll')
const handleDownload = (file: FileItem) => emit('download', file)
const handlePreview = (file: FileItem) => emit('preview', file)
const handleDelete = (file: FileItem) => emit('delete', file)
const handleDeleteFolder = (folder: { name: string, Prefix: string }) =>
  emit('deleteFolder', folder)
const handleDownloadFolder = (folder: { name: string, Prefix: string }) =>
  emit('downloadFolder', folder)
const handleRenameFolder = (folder: { name: string, Prefix: string }) =>
  emit('renameFolder', folder)
const handleRenameFile = (file: FileItem) => emit('renameFile', file)
const handleMetadata = (file: FileItem) => emit('metadata', file)
</script>
