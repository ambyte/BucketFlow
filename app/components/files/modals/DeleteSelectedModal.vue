<template>
  <UModal
    v-model:open="isOpen"
    title="Delete selected"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template #body>
      <p class="text-default mb-2">
        Are you sure you want to delete <span class="font-semibold">{{ summary }}</span>?
      </p>
      <ul
        v-if="itemNames.length > 0"
        class="text-sm text-muted mb-2 list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto"
      >
        <li
          v-for="name in visibleNames"
          :key="name"
        >
          {{ name }}
        </li>
        <li v-if="hiddenCount > 0">
          and {{ hiddenCount }} more
        </li>
      </ul>
      <p
        v-if="folderCount > 0"
        class="text-warning text-sm"
      >
        Folders and all their contents will be permanently deleted.
      </p>
    </template>
    <template #footer="{ close }">
      <UButton
        variant="outline"
        color="neutral"
        label="Cancel"
        :disabled="isDeleting"
        @click="
          $emit('cancel');
          close();
        "
      />
      <UButton
        color="error"
        :loading="isDeleting"
        label="Delete"
        @click="$emit('confirm')"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  open: boolean
  fileCount: number
  folderCount: number
  itemNames: string[]
  isDeleting: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const visibleNames = computed(() => props.itemNames.slice(0, 8))
const hiddenCount = computed(() =>
  Math.max(0, props.itemNames.length - visibleNames.value.length)
)

const summary = computed(() => {
  const parts: string[] = []
  if (props.fileCount) {
    parts.push(
      `${props.fileCount} file${props.fileCount === 1 ? '' : 's'}`
    )
  }
  if (props.folderCount) {
    parts.push(
      `${props.folderCount} folder${props.folderCount === 1 ? '' : 's'}`
    )
  }
  return parts.join(' and ') || 'the selected items'
})
</script>
