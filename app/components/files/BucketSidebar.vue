<template>
  <aside
    v-if="show"
    class="relative flex flex-col overflow-hidden min-h-max shrink-0"
    :style="{ width: `${sidebarWidth}px` }"
  >
    <div class="flex-1 overflow-y-auto border-r border-default">
      <div class="p-4">
        <h2 class="font-semibold text-sm">
          Buckets
        </h2>
      </div>
      <div class="px-2 pb-2">
        <div
          v-if="loading"
          class="p-2 text-sm text-muted"
        >
          Loading...
        </div>
        <div
          v-else-if="buckets.length === 0"
          class="p-2 text-sm text-muted"
        >
          No buckets
        </div>
        <div
          v-else
          class="space-y-1"
        >
          <div
            v-for="bucket in buckets"
            :key="bucket"
            class="group flex items-center gap-1 w-full rounded-md transition-colors"
            :class="{ 'bg-accented': selectedBucket === bucket }"
          >
            <button
              class="flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-elevated min-w-0"
              @click="$emit('select', bucket)"
            >
              <UIcon
                name="i-heroicons-folder"
                class="w-4 h-4 text-primary shrink-0"
              />
              <UTooltip
                :text="bucket"
                :delay-duration="200"
                :content="{ side: 'right' }"
                :ui="{
                  content: 'h-auto max-w-xs',
                  text: 'whitespace-normal break-all'
                }"
                class="min-w-0 flex-1 text-left"
              >
                <span class="block truncate text-default">{{ bucket }}</span>
              </UTooltip>
              <span
                v-if="bucketSizes[bucket] != null"
                class="ml-auto shrink-0 text-xs text-muted tabular-nums"
              >
                {{ formatFileSize(bucketSizes[bucket] ?? 0) }}
              </span>
              <div
                v-if="canRename || canDelete"
                class="shrink-0 flex items-center"
                :class="{ 'ml-auto': bucketSizes[bucket] == null }"
              >
                <UTooltip
                  v-if="canRename"
                  text="Rename bucket"
                >
                  <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-heroicons-pencil-square"
                    size="xs"
                    class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    @click.stop="$emit('rename', bucket)"
                  />
                </UTooltip>
                <UTooltip
                  v-if="canDelete"
                  text="Delete bucket"
                >
                  <UButton
                    variant="ghost"
                    color="error"
                    icon="i-heroicons-trash"
                    size="xs"
                    class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    @click.stop="$emit('delete', bucket)"
                  />
                </UTooltip>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div
      class="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60"
      :class="{ 'bg-primary/50': isResizing }"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize buckets panel"
      @mousedown.prevent="onResizeStart"
    />
  </aside>
</template>

<script setup lang="ts">
import { formatFileSize } from '../../utils/fileUtils'

const STORAGE_KEY = 'bucketflow-bucket-sidebar-width'
const MIN_WIDTH = 180
const MAX_WIDTH = 560
const DEFAULT_WIDTH = 256

withDefaults(defineProps<{
  show: boolean
  buckets: string[]
  bucketSizes?: Record<string, number>
  selectedBucket?: string
  loading: boolean
  canRename: boolean
  canDelete: boolean
}>(), {
  bucketSizes: () => ({})
})

defineEmits<{
  select: [bucket: string]
  rename: [bucket: string]
  delete: [bucket: string]
}>()

const sidebarWidth = ref(DEFAULT_WIDTH)
const isResizing = ref(false)

let moveListener: ((event: MouseEvent) => void) | null = null
let upListener: (() => void) | null = null

onMounted(() => {
  const saved = Number(localStorage.getItem(STORAGE_KEY))
  if (Number.isFinite(saved) && saved >= MIN_WIDTH) {
    sidebarWidth.value = Math.min(MAX_WIDTH, saved)
  }
})

function clearResizeListeners() {
  if (moveListener) {
    document.removeEventListener('mousemove', moveListener)
    moveListener = null
  }
  if (upListener) {
    document.removeEventListener('mouseup', upListener)
    upListener = null
  }
  document.body.style.removeProperty('cursor')
  document.body.style.removeProperty('user-select')
  isResizing.value = false
}

function onResizeStart(event: MouseEvent) {
  const startX = event.clientX
  const startWidth = sidebarWidth.value
  isResizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  moveListener = (moveEvent: MouseEvent) => {
    const next = startWidth + (moveEvent.clientX - startX)
    sidebarWidth.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next))
  }

  upListener = () => {
    localStorage.setItem(STORAGE_KEY, String(sidebarWidth.value))
    clearResizeListeners()
  }

  document.addEventListener('mousemove', moveListener)
  document.addEventListener('mouseup', upListener)
}

onBeforeUnmount(() => {
  clearResizeListeners()
})
</script>
