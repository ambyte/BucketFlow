<template>
  <UModal
    v-model:open="isOpen"
    :title="fileName ? `Metadata: ${fileName}` : 'File Metadata'"
    :ui="{ content: 'max-w-xl', footer: 'justify-end gap-2' }"
  >
    <template #body>
      <div
        v-if="loading"
        class="flex items-center gap-2 py-4"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-5 h-5 animate-spin text-primary"
        />
        <span class="text-muted">Loading metadata...</span>
      </div>
      <div
        v-else
        class="space-y-3"
      >
        <p class="text-sm text-muted">
          User-defined metadata (key-value pairs). Keys and values are stored
          with the file in S3.
        </p>
        <div
          v-for="(entry, index) in entries"
          :key="index"
          class="flex gap-2 items-center"
        >
          <UInput
            v-model="entry.key"
            placeholder="Key (e.g. description)"
            class="flex-1"
            :disabled="readonly"
          />
          <UInput
            v-model="entry.value"
            placeholder="Value"
            class="flex-1"
            :disabled="readonly"
          />
          <UButton
            v-if="!readonly"
            variant="ghost"
            color="error"
            icon="i-heroicons-trash"
            size="sm"
            @click="removeEntry(index)"
          />
        </div>
        <UButton
          v-if="!readonly"
          variant="outline"
          color="neutral"
          size="sm"
          icon="i-heroicons-plus"
          label="Add Entry"
          @click="addEntry"
        />
      </div>
    </template>
    <template #footer>
      <UButton
        variant="outline"
        color="neutral"
        label="Close"
        :disabled="saving"
        @click="$emit('close')"
      />
      <UButton
        v-if="!readonly"
        color="primary"
        label="Save"
        :loading="saving"
        @click="$emit('save', entries)"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface MetadataEntry {
  key: string
  value: string
}

interface Props {
  open: boolean
  fileName: string
  entries: MetadataEntry[]
  loading: boolean
  saving: boolean
  readonly: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [entries: MetadataEntry[]]
  'close': []
  'update:entries': [entries: MetadataEntry[]]
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const removeEntry = (index: number) => {
  const newEntries = props.entries.filter((_, i) => i !== index)
  emit('update:entries', newEntries)
}

const addEntry = () => {
  emit('update:entries', [...props.entries, { key: '', value: '' }])
}
</script>
