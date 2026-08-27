<template>
  <UModal
    v-model:open="isOpen"
    :title="fileName ? `Metadata: ${fileName}` : 'File Metadata'"
    :ui="{ content: showObjectMetadata ? 'max-w-2xl' : 'max-w-xl', footer: 'justify-end gap-2' }"
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
        class="space-y-4"
      >
        <div
          v-if="showObjectMetadata"
          class="space-y-2"
        >
          <p class="text-sm font-medium text-highlighted">
            Object metadata
          </p>
          <p class="text-sm text-muted">
            System properties from S3 HeadObject (read-only).
          </p>
          <div
            v-if="objectEntries.length === 0"
            class="text-sm text-muted py-1"
          >
            No object metadata returned.
          </div>
          <div
            v-else
            class="max-h-64 overflow-auto rounded-lg border border-default divide-y divide-default"
          >
            <div
              v-for="entry in objectEntries"
              :key="entry.key"
              class="grid grid-cols-[minmax(8rem,12rem)_1fr] gap-3 px-3 py-2 text-sm"
            >
              <span
                class="font-medium text-highlighted truncate"
                :title="entry.key"
              >
                {{ entry.key }}
              </span>
              <span
                class="text-muted break-all font-mono text-xs leading-5"
                :title="entry.value"
              >
                {{ entry.value }}
              </span>
            </div>
          </div>
          <USeparator />
        </div>
        <p class="text-sm font-medium text-highlighted">
          User-defined metadata
        </p>
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
  objectEntries?: MetadataEntry[]
  showObjectMetadata?: boolean
  loading: boolean
  saving: boolean
  readonly: boolean
}

const props = withDefaults(defineProps<Props>(), {
  objectEntries: () => [],
  showObjectMetadata: false
})

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
