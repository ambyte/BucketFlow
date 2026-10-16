<template>
  <UModal
    v-model:open="isOpen"
    :title="fileName"
    :ui="{ content: 'max-w-4xl' }"
  >
    <template #body>
      <div
        v-if="loading"
        class="flex justify-center py-12"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-8 h-8 animate-spin text-primary"
        />
      </div>
      <div
        v-else-if="previewUrl || textContent !== null"
        class="flex justify-center"
      >
        <img
          v-if="isImage && previewUrl"
          :src="previewUrl"
          class="max-h-[60vh] object-contain"
          :alt="fileName"
        >
        <iframe
          v-else-if="isPdf && previewUrl"
          :src="previewUrl"
          class="w-full h-[60vh]"
        />
        <div
          v-else-if="isText && textContent !== null"
          class="w-full max-h-[60vh] overflow-auto"
        >
          <div class="flex justify-end pb-2">
            <UButton
              icon="i-heroicons-clipboard"
              variant="soft"
              size="sm"
              @click="copyTextContent"
            >
              Copy text
            </UButton>
          </div>
          <pre
            class="p-4 bg-elevated rounded-lg text-sm text-highlighted font-mono whitespace-pre-wrap wrap-break-word"
          ><code>{{ textContent }}</code></pre>
        </div>
        <div
          v-else
          class="text-center py-12"
        >
          <UIcon
            name="i-heroicons-document"
            class="w-16 h-16 mx-auto mb-4 text-muted"
          />
          <p class="text-muted">
            Preview not available for this file type
          </p>
          <UButton
            v-if="fileName"
            color="primary"
            class="mt-4"
            @click="$emit('download')"
          >
            Download File
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  open: boolean
  fileName: string
  previewUrl: string | null
  textContent: string | null
  loading: boolean
  isImage: boolean
  isPdf: boolean
  isText: boolean
}

const props = defineProps<Props>()
const toast = useToast()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'download': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const copyTextContent = async () => {
  if (props.textContent === null) return

  try {
    await navigator.clipboard.writeText(props.textContent)
    toast.add({
      title: 'Copied',
      description: 'Text copied to clipboard',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: 'Failed to copy',
      description: error instanceof Error ? error.message : 'Could not copy text to clipboard',
      color: 'error'
    })
  }
}
</script>
