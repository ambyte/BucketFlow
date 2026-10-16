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
          class="flex w-full max-h-[60vh] flex-col"
        >
          <div class="flex shrink-0 items-center justify-between gap-2 pb-2">
            <div class="flex items-center gap-2">
              <template v-if="editing">
                <UButton
                  icon="i-heroicons-check"
                  color="primary"
                  size="sm"
                  :loading="saving"
                  :disabled="saving || draftText === textContent"
                  @click="emit('save', draftText)"
                >
                  Save
                </UButton>
                <UButton
                  variant="ghost"
                  size="sm"
                  :disabled="saving"
                  @click="cancelEditing"
                >
                  Cancel
                </UButton>
              </template>
              <UButton
                v-else-if="editable"
                icon="i-heroicons-pencil-square"
                variant="soft"
                size="sm"
                @click="editing = true"
              >
                Edit
              </UButton>
            </div>
            <UButton
              icon="i-heroicons-clipboard"
              variant="soft"
              size="sm"
              @click="copyTextContent(editing ? draftText : textContent)"
            >
              Copy
            </UButton>
          </div>
          <div class="min-h-0 flex-1 overflow-auto">
            <textarea
              v-if="editing"
              v-model="draftText"
              class="w-full h-[60vh] p-4 bg-elevated rounded-lg text-sm text-highlighted font-mono whitespace-pre-wrap wrap-break-word resize-y focus-visible:outline-primary"
              :disabled="saving"
              :aria-label="`Edit ${fileName}`"
            />
            <pre
              v-else
              class="p-4 bg-elevated rounded-lg text-sm text-highlighted font-mono whitespace-pre-wrap wrap-break-word"
            ><code>{{ textContent }}</code></pre>
          </div>
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
  editable: boolean
  saving: boolean
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
  'save': [content: string]
}>()

const editing = ref(false)
const draftText = ref('')

watch([() => props.open, () => props.textContent], () => {
  draftText.value = props.textContent ?? ''
  editing.value = false
})

watch(() => props.editable, (editable) => {
  if (!editable) cancelEditing()
})

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const cancelEditing = () => {
  draftText.value = props.textContent ?? ''
  editing.value = false
}

const copyTextContent = async (text: string | null) => {
  if (text === null) return

  try {
    await navigator.clipboard.writeText(text)
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
