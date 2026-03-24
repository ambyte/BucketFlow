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
        :disabled="!folderName.trim()"
        :loading="props.isCreating ?? false"
        label="Create"
        @click="handleSubmit"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
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

const handleSubmit = () => {
  if (!folderName.value.trim()) return
  emit('create', folderName.value.trim())
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
