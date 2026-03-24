<template>
  <div class="w-full overflow-x-auto">
    <table class="w-full min-w-[600px]">
      <colgroup>
        <col style="width: 2.75rem">
        <col style="width: 100%">
        <col
          v-for="metaKey in metadataColumns"
          :key="metaKey"
          style="width: 1%; max-width: 400px"
        >
        <col style="width: 8rem">
        <col style="width: 8rem">
        <col style="width: 3.5rem">
      </colgroup>
      <thead>
        <tr class="border-b border-accented">
          <th
            class="w-11 py-3 px-2 align-middle"
            @click.stop
          >
            <UCheckbox
              v-if="data.length > 0"
              :model-value="selectAllCheckboxValue"
              @update:model-value="emit('toggleSelectAll')"
            />
          </th>
          <th class="text-left py-3 px-4 font-medium">
            <UButton
              color="neutral"
              variant="ghost"
              label="Name"
              :icon="getSortIcon('name')"
              class="-mx-2.5"
              @click="sortBy('name')"
            />
          </th>
          <th
            v-for="metaKey in metadataColumns"
            :key="metaKey"
            class="text-left py-3 px-4 font-medium"
            style="max-width: 400px"
          >
            {{ metaKey.charAt(0).toUpperCase() + metaKey.slice(1) }}
          </th>
          <th class="text-right py-3 px-4 font-medium">
            <UButton
              color="neutral"
              variant="ghost"
              label="Size"
              :icon="getSortIcon('Size')"
              class="-mx-2.5 ml-auto"
              @click="sortBy('Size')"
            />
          </th>
          <th class="text-right w-32 py-3 px-4 font-medium">
            <UButton
              color="neutral"
              variant="ghost"
              label="Date"
              :icon="getSortIcon('LastModified')"
              class="-mx-2.5 ml-auto"
              @click="sortBy('LastModified')"
            />
          </th>
          <th class="text-right w-14 py-3 px-2" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in sortedData"
          :key="item.name"
          class="border-b border-accented/50 hover:bg-elevated/50 transition-colors"
          @click="handleRowClick(item)"
        >
          <td
            class="py-2 px-2 align-middle w-11"
            @click.stop
          >
            <UCheckbox
              :model-value="selectedIds.includes(rowId(item))"
              @update:model-value="() => emit('toggleSelect', item)"
            />
          </td>
          <td class="py-2 px-4">
            <div class="flex items-center gap-2">
              <UIcon
                :name="
                  item.isFolder
                    ? 'i-heroicons-folder'
                    : getFileIcon(item as FileItem)
                "
                :class="[
                  'w-5 h-5 shrink-0',
                  item.isFolder ? 'text-primary' : 'text-muted'
                ]"
              />
              <span class="flex-1 truncate text-highlighted">{{
                item.name
              }}</span>
            </div>
          </td>
          <td
            v-for="metaKey in metadataColumns"
            :key="metaKey"
            class="py-2 px-4 text-left"
            style="max-width: 400px"
          >
            <span
              v-if="!item.isFolder"
              class="text-muted text-sm truncate block max-w-[400px]"
              :title="item.Metadata?.[metaKey] ?? ''"
            >
              {{ item.Metadata?.[metaKey] ?? "—" }}
            </span>
          </td>
          <td class="py-2 px-2 text-right">
            <span
              v-if="!item.isFolder"
              class="text-sm text-muted"
            >{{
              formatFileSize(item.Size)
            }}</span>
          </td>
          <td class="py-2 px-2 text-right">
            <span
              v-if="!item.isFolder"
              class="text-muted text-sm"
            >{{
              formatDateShort(item.LastModified)
            }}</span>
          </td>
          <td class="py-2 px-2 text-right w-14">
            <div
              class="flex justify-end"
              @click.stop
            >
              <UDropdownMenu
                :items="getRowMenuItems(item)"
                :modal="false"
                :content="{ align: 'end' }"
              >
                <UButton
                  variant="ghost"
                  color="neutral"
                  icon="i-heroicons-ellipsis-vertical"
                  size="md"
                  class="cursor-pointer"
                  aria-label="Row actions"
                />
              </UDropdownMenu>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { FileItem, TableRow } from '../../types'
import {
  getFileIcon,
  formatFileSize,
  formatDateShort,
  canPreview
} from '../../utils/fileUtils'
import { useDoubleClick } from '../../composables/useDoubleClick'

interface Props {
  data: TableRow[]
  isEditor?: boolean
  showMetadata?: boolean
  metadataColumns?: string[]
  selectedIds: string[]
  selectAllCheckboxValue: boolean | 'indeterminate'
}

const props = withDefaults(defineProps<Props>(), {
  showMetadata: true,
  metadataColumns: () => []
})

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

function rowId(item: TableRow): string {
  if (item.isFolder) {
    return item.Prefix ?? ''
  }
  return item.Key ?? ''
}

const sortColumn = ref<'name' | 'Size' | 'LastModified'>('name')
const sortDesc = ref(false)

function getSortIcon(column: 'name' | 'Size' | 'LastModified') {
  if (sortColumn.value !== column) return 'i-heroicons-arrows-up-down'
  return sortDesc.value ? 'i-heroicons-arrow-down' : 'i-heroicons-arrow-up'
}

const sortedData = computed(() => {
  const items = [...props.data]

  return items.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1

    let cmp = 0
    if (sortColumn.value === 'name') {
      cmp = a.name.localeCompare(b.name)
    } else if (sortColumn.value === 'Size') {
      cmp = a.Size - b.Size
    } else {
      cmp
        = new Date(a.LastModified).getTime() - new Date(b.LastModified).getTime()
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

const { handleClick } = useDoubleClick<TableRow>(
  item => item && emit('select', item),
  item => item && emit('doubleClick', item)
)

function handleRowClick(item: TableRow) {
  handleClick(item)
}

function getRowMenuItems(item: TableRow): DropdownMenuItem[][] {
  const primary: DropdownMenuItem[] = []

  if (!item.isFolder) {
    const file = item as FileItem
    if (props.showMetadata) {
      primary.push({
        label: 'Metadata',
        icon: 'i-heroicons-tag',
        onSelect() {
          emit('metadata', file)
        }
      })
    }
    if (props.isEditor) {
      primary.push({
        label: 'Rename',
        icon: 'i-heroicons-pencil-square',
        onSelect() {
          emit('renameFile', file)
        }
      })
    }
    primary.push({
      label: 'Download',
      icon: 'i-heroicons-arrow-down-tray',
      onSelect() {
        emit('download', file)
      }
    })
    if (canPreview(file)) {
      primary.push({
        label: 'Preview',
        icon: 'i-heroicons-eye',
        onSelect() {
          emit('preview', file)
        }
      })
    }
  } else {
    primary.push({
      label: 'Download',
      icon: 'i-heroicons-arrow-down-tray',
      onSelect() {
        emit('downloadFolder', {
          name: item.name,
          Prefix: item.Prefix || ''
        })
      }
    })
    if (props.isEditor) {
      primary.push({
        label: 'Rename',
        icon: 'i-heroicons-pencil-square',
        onSelect() {
          emit('renameFolder', {
            name: item.name,
            Prefix: item.Prefix || ''
          })
        }
      })
    }
  }

  const destructive: DropdownMenuItem[] = []
  if (props.isEditor) {
    if (item.isFolder) {
      destructive.push({
        label: 'Delete',
        icon: 'i-heroicons-trash',
        color: 'error',
        onSelect() {
          emit('deleteFolder', {
            name: item.name,
            Prefix: item.Prefix || ''
          })
        }
      })
    } else {
      destructive.push({
        label: 'Delete',
        icon: 'i-heroicons-trash',
        color: 'error',
        onSelect() {
          emit('delete', item as FileItem)
        }
      })
    }
  }

  const groups: DropdownMenuItem[][] = []
  if (primary.length) groups.push(primary)
  if (destructive.length) groups.push(destructive)
  return groups
}
</script>
