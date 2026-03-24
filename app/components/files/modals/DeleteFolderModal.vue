<template>
  <UModal
    v-model:open="isOpen"
    title="Delete Folder"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template #body>
      <div
        v-if="isChecking"
        class="flex items-center gap-2 py-4"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-5 h-5 animate-spin text-primary"
        />
        <span class="text-muted">Checking folder contents...</span>
      </div>
      <div v-else>
        <p class="text-default mb-2">
          Are you sure you want to delete
          <span class="font-semibold">{{ folderName }}</span>?
        </p>
        <p
          v-if="contentsCount > 0"
          class="text-warning text-sm"
        >
          This folder contains {{ contentsCount }} item(s). All contents will be
          permanently deleted.
        </p>
      </div>
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
        :disabled="isChecking"
        label="Delete"
        @click="$emit('confirm')"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  open: boolean
  folderName: string
  prefix: string
  contentsCount: number
  isChecking: boolean
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
</script>
