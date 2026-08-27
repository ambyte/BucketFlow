<template>
  <UModal
    v-model:open="isOpen"
    title="Create New Folder"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template #body>
      <UFormField
        label="Folder Name"
        required
        :error="nameError"
        help="Do not use slashes — nested folders are created by opening a folder first."
      >
        <UInput
          v-model="folderName"
          placeholder="Enter folder name"
          class="w-full"
          @keyup.enter="handleSubmit"
        />
      </UFormField>
    </template>
    <template #footer="{ close }">
      <UButton
        variant="outline"
        color="neutral"
        label="Cancel"
        @click="close"
      />
      <UButton
        color="primary"
        :disabled="!folderName.trim() || !!nameError"
        :loading="props.isCreating ?? false"
        label="Create"
        @click="handleSubmit"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { isValidFolderName } from '../../../utils/validators'

const props = defineProps<{
  open: boolean
  isCreating?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'create': [name: string]
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const folderName = ref('')

const nameError = computed(() => {
  const name = folderName.value.trim()
  if (!name) return undefined
  if (!isValidFolderName(name)) {
    return 'Folder name must not contain slashes'
  }
  return undefined
})

const handleSubmit = () => {
  const name = folderName.value.trim()
  if (!name || nameError.value) return
  emit('create', name)
}

watch(
  () => props.open,
  (newValue) => {
    if (newValue) {
      folderName.value = ''
    }
  }
)
</script>
