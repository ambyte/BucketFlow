<template>
  <UTable v-model:sorting="sorting" :data="data" :columns="tableColumns" :sorting-options="sortingOptions"
    :ui="{ tr: 'hover:bg-elevated/50' }" @select="(e: Event, row: any) => handleRowClick(row)" />
</template>

<script setup lang="ts">
import { computed, h, ref, resolveComponent } from 'vue'
import { getSortedRowModel } from '@tanstack/vue-table'
import type { FileItem } from '../types'
import type { TableColumn } from '@nuxt/ui'
import { getFileIcon, formatFileSize, formatDateShort, canPreview } from '../utils/fileUtils'

interface Props {
  data: Array<FileItem & { isFolder?: boolean; name: string }>
  isEditor?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [item: FileItem & { isFolder?: boolean; name: string }]
  doubleClick: [item: FileItem & { isFolder?: boolean; name: string }]
  download: [file: FileItem]
  preview: [file: FileItem]
  delete: [file: FileItem]
  deleteFolder: [folder: { name: string; Prefix: string }]
  renameFolder: [folder: { name: string; Prefix: string }]
  renameFile: [file: FileItem]
}>()

const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')

type TableRow = FileItem & { isFolder?: boolean; name: string }

const sorting = ref([{ id: 'name', desc: false }])

const sortingOptions = computed(() => ({
  getSortedRowModel: getSortedRowModel()
} as any))

// Click handling logic
let lastClickTime = 0
let lastClickRowId: string | null = null
let clickTimeout: ReturnType<typeof setTimeout> | null = null

const handleRowClick = (row: any) => {
  const now = Date.now()
  const rowId = (row.original as any).name
  const timeDiff = now - lastClickTime

  if (clickTimeout) {
    clearTimeout(clickTimeout)
    clickTimeout = null
  }

  if (lastClickRowId === rowId && timeDiff < 300) {
    // Double click detected
    emit('doubleClick', row.original)
    lastClickTime = 0
    lastClickRowId = null
  } else {
    // Single click - delay to allow for double click
    lastClickTime = now
    lastClickRowId = rowId
    clickTimeout = setTimeout(() => {
      if (lastClickRowId === rowId) {
        emit('select', row.original)
      }
      clickTimeout = null
    }, 300)
  }
}

// Table columns definition
const tableColumns = computed<TableColumn<TableRow>[]>(() => [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Name',
        icon: isSorted ? (isSorted === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down') : 'i-heroicons-arrows-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    sortingFn: (rowA: any, rowB: any) => {
      const a = rowA.original as any
      const b = rowB.original as any
      // Folders first
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      // Then sort by name
      return a.name.localeCompare(b.name)
    },
    cell: ({ row }) => {
      const item = row.original as any
      const isFolder = item.isFolder
      const fileItem = item as unknown as FileItem

      return h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, {
          name: isFolder ? 'i-heroicons-folder' : getFileIcon(fileItem),
          class: `w-5 h-5 shrink-0 ${isFolder ? 'text-primary' : 'text-muted'}`
        }),
        h('span', { class: 'flex-1 truncate text-highlighted' }, item.name)
      ])
    }
  },
  {
    accessorKey: 'Size',
    size: 120,
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Size',
        icon: isSorted ? (isSorted === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down') : 'i-heroicons-arrows-up-down',
        class: '-mx-2.5 ml-auto',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    sortingFn: (rowA: any, rowB: any) => {
      const a = rowA.original as any
      const b = rowB.original as any
      // Folders first
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      // Then sort by size
      return a.Size - b.Size
    },
    meta: {
      class: {
        th: 'text-right w-48',
        td: 'text-right w-48'
      }
    },
    cell: ({ row }) => {
      const item = row.original as any
      if (item.isFolder) return ''
      return h('span', { class: 'text-sm text-muted' }, formatFileSize(item.Size))
    }
  },
  {
    accessorKey: 'LastModified',
    size: 120,
    header: ({ column }) => {
      const isSorted = column.getIsSorted()
      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Date',
        icon: isSorted ? (isSorted === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down') : 'i-heroicons-arrows-up-down',
        class: '-mx-2.5 ml-auto',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    sortingFn: (rowA: any, rowB: any) => {
      const a = rowA.original as any
      const b = rowB.original as any
      // Folders first
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      // Then sort by date
      return new Date(a.LastModified).getTime() - new Date(b.LastModified).getTime()
    },
    meta: {
      class: {
        th: 'text-right w-32',
        td: 'text-right w-32'
      }
    },
    cell: ({ row }) => {
      const item = row.original as any
      if (item.isFolder) return ''
      return h('span', { class: 'text-muted text-sm w-24 text-right' }, formatDateShort(item.LastModified))
    }
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        td: 'text-right w-32'
      }
    },
    cell: ({ row }) => {
      const item = row.original as any
      const fileItem = item as unknown as FileItem
      const isFolder = item.isFolder

      return h('div', { class: 'flex items-center gap-1 justify-end' }, [
        props.isEditor && !isFolder && h(UTooltip, { text: 'Rename' }, () =>
          h(UButton, {
            variant: 'ghost',
            color: 'neutral',
            icon: 'i-heroicons-pencil-square',
            size: 'md',
            class: 'cursor-pointer',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('renameFile', fileItem)
            }
          })
        ),
        !isFolder && h(UTooltip, { text: 'Download' }, () =>
          h(UButton, {
            variant: 'ghost',
            color: 'neutral',
            icon: 'i-heroicons-arrow-down-tray',
            size: 'md',
            class: 'cursor-pointer',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('download', fileItem)
            }
          })
        ),
        !isFolder && canPreview(fileItem) && h(UTooltip, { text: 'Preview' }, () =>
          h(UButton, {
            variant: 'ghost',
            color: 'neutral',
            icon: 'i-heroicons-eye',
            size: 'md',
            class: 'cursor-pointer',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('preview', fileItem)
            }
          })
        ),
        props.isEditor && isFolder && h(UTooltip, { text: 'Rename' }, () =>
          h(UButton, {
            variant: 'ghost',
            color: 'neutral',
            icon: 'i-heroicons-pencil-square',
            size: 'md',
            class: 'cursor-pointer',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('renameFolder', { name: item.name, Prefix: (item as any).Prefix })
            }
          })
        ),
        props.isEditor && isFolder && h(UTooltip, { text: 'Delete' }, () =>
          h(UButton, {
            variant: 'ghost',
            color: 'error',
            icon: 'i-heroicons-trash',
            size: 'md',
            class: 'cursor-pointer',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('deleteFolder', { name: item.name, Prefix: (item as any).Prefix })
            }
          })
        ),
        props.isEditor && !isFolder && h(UTooltip, { text: 'Delete' }, () =>
          h(UButton, {
            variant: 'ghost',
            color: 'error',
            icon: 'i-heroicons-trash',
            size: 'md',
            class: 'cursor-pointer',
            onClick: (e: Event) => {
              e.stopPropagation()
              emit('delete', fileItem)
            }
          })
        )
      ].filter(Boolean))
    }
  }
])
</script>
