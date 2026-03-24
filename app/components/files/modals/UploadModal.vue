<template>
  <UModal
    v-model:open="isOpen"
    title="Upload Files"
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <div
        v-if="uploadProgress.length === 0"
        class="border-2 border-dashed border-accented rounded-lg p-8 text-center"
        @drop.prevent="handleDrop"
        @dragover.prevent
      >
        <UIcon
          name="i-heroicons-cloud-arrow-up"
          class="w-12 h-12 mx-auto mb-4 text-muted"
        />
        <p class="text-muted mb-4">
          Drag and drop files here, or click to browse
        </p>
        <UInput
          type="file"
          multiple
          @change="handleFileSelect"
        />
      </div>
      <div
        v-else
        class="space-y-3 max-h-[400px] overflow-y-auto"
      >
        <div
          v-for="item in uploadProgress"
          :key="item.id"
          class="flex items-center gap-3 p-3 border border-default rounded-lg"
        >
          <UIcon
            :name="
              item.status === 'completed'
                ? 'i-heroicons-check-circle'
                : item.status === 'error'
                  ? 'i-heroicons-x-circle'
                  : 'i-heroicons-arrow-up-tray'
            "
            :class="
              item.status === 'completed'
                ? 'text-success'
                : item.status === 'error'
                  ? 'text-error'
                  : 'text-primary animate-pulse'
            "
            class="w-5 h-5 shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate text-highlighted">
              {{ item.file.name }}
            </p>
            <div
              v-if="item.status === 'uploading'"
              class="mt-2"
            >
              <UProgress
                :model-value="item.progress"
                size="sm"
              />
            </div>
            <p
              v-else-if="item.status === 'completed'"
              class="text-xs text-success mt-1"
            >
              Upload completed
            </p>
            <p
              v-else-if="item.status === 'error'"
              class="text-xs text-error mt-1"
            >
              {{ item.error || "Upload failed" }}
            </p>
          </div>
          <span
            v-if="item.status === 'uploading'"
            class="text-xs text-muted font-medium whitespace-nowrap"
          >{{ item.progress }}%</span>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton
        variant="outline"
        color="neutral"
        block
        :disabled="isUploading"
        @click="close"
      >
        {{ isUploading ? "Uploading..." : "Close" }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UploadProgress } from '../../../types'

interface Props {
  open: boolean
  uploadProgress: UploadProgress[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'upload': [files: FileList]
  'drop': [files: FileList]
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const isUploading = computed(() => {
  return props.uploadProgress.some(item => item.status === 'uploading')
})

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('upload', target.files)
  }
}

const handleDrop = (event: DragEvent) => {
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    emit('drop', event.dataTransfer.files)
  }
}
</script>
