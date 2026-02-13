<template>
  <div class="w-full overflow-x-auto">
    <table class="w-full min-w-[600px]">
      <colgroup>
        <col style="width: 100%">
        <col v-for="metaKey in metadataColumns" :key="metaKey" style="width: 1%; max-width: 400px">
        <col style="width: 8rem">
        <col style="width: 8rem">
        <col style="width: 8rem">
      </colgroup>
      <thead>
        <tr class="border-b border-accented">
          <th class="text-left py-3 px-4 font-medium">
            <UButton color="neutral" variant="ghost" label="Name" :icon="getSortIcon('name')" class="-mx-2.5"
              @click="sortBy('name')" />
          </th>
          <th v-for="metaKey in metadataColumns" :key="metaKey" class="text-left py-3 px-4 font-medium"
            style="max-width: 400px">
            {{ metaKey.charAt(0).toUpperCase() + metaKey.slice(1) }}
          </th>
          <th class="text-right py-3 px-4 font-medium">
            <UButton color="neutral" variant="ghost" label="Size" :icon="getSortIcon('Size')" class="-mx-2.5 ml-auto"
              @click="sortBy('Size')" />
          </th>
          <th class="text-right w-32 py-3 px-4 font-medium">
            <UButton color="neutral" variant="ghost" label="Date" :icon="getSortIcon('LastModified')"
              class="-mx-2.5 ml-auto" @click="sortBy('LastModified')" />
          </th>
          <th class="text-right w-32 py-3 px-4" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in sortedData" :key="item.name"
          class="border-b border-accented/50 hover:bg-elevated/50 transition-colors" @click="handleRowClick(item)">
          <td class="py-2 px-4">
            <div class="flex items-center gap-2">
              <UIcon :name="item.isFolder ? 'i-heroicons-folder' : getFileIcon(item as FileItem)"
                :class="['w-5 h-5 shrink-0', item.isFolder ? 'text-primary' : 'text-muted']" />
              <span class="flex-1 truncate text-highlighted">{{ item.name }}</span>
            </div>
          </td>
          <td v-for="metaKey in metadataColumns" :key="metaKey" class="py-2 px-4 text-left" style="max-width: 400px">
            <span v-if="!item.isFolder" class="text-muted text-sm truncate block max-w-[400px]"
              :title="item.Metadata?.[metaKey] ?? ''">
              {{ item.Metadata?.[metaKey] ?? '—' }}
            </span>
          </td>
          <td class="py-2 px-2 text-right">
            <span v-if="!item.isFolder" class="text-sm text-muted">{{ formatFileSize(item.Size) }}</span>
          </td>
          <td class="py-2 px-2 text-right">
            <span v-if="!item.isFolder" class="text-muted text-sm">{{ formatDateShort(item.LastModified) }}</span>
          </td>
          <td class="py-2 px-4 text-right w-32">
            <div class="flex items-center gap-1 justify-end">
              <UTooltip v-if="showMetadata && !item.isFolder" text="Metadata">
                <UButton variant="ghost" color="neutral" icon="i-heroicons-tag" size="md" class="cursor-pointer"
                  @click.stop="emit('metadata', item as FileItem)" />
              </UTooltip>
              <UTooltip v-if="isEditor && !item.isFolder" text="Rename">
                <UButton variant="ghost" color="neutral" icon="i-heroicons-pencil-square" size="md"
                  class="cursor-pointer" @click.stop="emit('renameFile', item as FileItem)" />
              </UTooltip>
              <UTooltip v-if="!item.isFolder" text="Download">
                <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-down-tray" size="md"
                  class="cursor-pointer" @click.stop="emit('download', item as FileItem)" />
              </UTooltip>
              <UTooltip v-if="!item.isFolder && canPreview(item as FileItem)" text="Preview">
                <UButton variant="ghost" color="neutral" icon="i-heroicons-eye" size="md" class="cursor-pointer"
                  @click.stop="emit('preview', item as FileItem)" />
              </UTooltip>
              <UTooltip v-if="isEditor && item.isFolder" text="Rename">
                <UButton variant="ghost" color="neutral" icon="i-heroicons-pencil-square" size="md"
                  class="cursor-pointer"
                  @click.stop="emit('renameFolder', { name: item.name, Prefix: (item as any).Prefix })" />
              </UTooltip>
              <UTooltip v-if="isEditor && item.isFolder" text="Delete">
                <UButton variant="ghost" color="error" icon="i-heroicons-trash" size="md" class="cursor-pointer"
                  @click.stop="emit('deleteFolder', { name: item.name, Prefix: (item as any).Prefix })" />
              </UTooltip>
              <UTooltip v-if="isEditor && !item.isFolder" text="Delete">
                <UButton variant="ghost" color="error" icon="i-heroicons-trash" size="md" class="cursor-pointer"
                  @click.stop="emit('delete', item as FileItem)" />
              </UTooltip>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FileItem } from '../types'
import { getFileIcon, formatFileSize, formatDateShort, canPreview } from '../utils/fileUtils'

type TableRow = FileItem & { isFolder?: boolean; name: string }

interface Props {
  data: Array<FileItem & { isFolder?: boolean; name: string }>
  isEditor?: boolean
  showMetadata?: boolean
  metadataColumns?: string[]
}

const props = withDefaults(defineProps<Props>(), { showMetadata: true, metadataColumns: () => [] })

const emit = defineEmits<{
  select: [item: TableRow]
  doubleClick: [item: TableRow]
  download: [file: FileItem]
  preview: [file: FileItem]
  delete: [file: FileItem]
  deleteFolder: [folder: { name: string; Prefix: string }]
  renameFolder: [folder: { name: string; Prefix: string }]
  renameFile: [file: FileItem]
  metadata: [file: FileItem]
}>()

const sortColumn = ref<'name' | 'Size' | 'LastModified'>('name')
const sortDesc = ref(false)

function getSortIcon(column: 'name' | 'Size' | 'LastModified') {
  if (sortColumn.value !== column) return 'i-heroicons-arrows-up-down'
  return sortDesc.value ? 'i-heroicons-arrow-down' : 'i-heroicons-arrow-up'
}

const sortedData = computed(() => {
  const items = [...props.data]

  return items.sort((a, b) => {
    // Folders first
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    let cmp = 0
    if (sortColumn.value === 'name') {
      cmp = a.name.localeCompare(b.name)
    } else if (sortColumn.value === 'Size') {
      cmp = a.Size - b.Size
    } else {
      cmp = new Date(a.LastModified).getTime() - new Date(b.LastModified).getTime()
    }

    return sortDesc.value ? -cmp : cmp
  })
})

function sortBy(column: 'name' | 'Size' | 'LastModified') {
  if (sortColumn.value === column) {
    sortDesc.value = !sortDesc.value
  } else {
    sortColumn.value = column
    sortDesc.value = false
  }
}

// Click handling: single vs double
let lastClickTime = 0
let lastClickRowId: string | null = null
let clickTimeout: ReturnType<typeof setTimeout> | null = null

function handleRowClick(item: TableRow) {
  const now = Date.now()
  const rowId = item.name
  const timeDiff = now - lastClickTime

  if (clickTimeout) {
    clearTimeout(clickTimeout)
    clickTimeout = null
  }

  if (lastClickRowId === rowId && timeDiff < 300) {
    emit('doubleClick', item)
    lastClickTime = 0
    lastClickRowId = null
  } else {
    lastClickTime = now
    lastClickRowId = rowId
    clickTimeout = setTimeout(() => {
      if (lastClickRowId === rowId) {
        emit('select', item)
      }
      clickTimeout = null
    }, 300)
  }
}
</script>
