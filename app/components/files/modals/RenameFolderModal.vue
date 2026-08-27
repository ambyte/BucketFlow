<template>
  <BaseRenameModal
    v-model:open="isOpen"
    title="Rename Folder"
    label="Folder Name"
    :current-name="props.currentName"
    :is-renaming="props.isRenaming"
    action-label="Rename"
    :validate="isValidFolderName"
    error-message="Folder name must not contain slashes"
    help="Do not use slashes."
    @submit="$emit('rename', $event)"
  />
</template>

<script setup lang="ts">
import { isValidFolderName } from '../../../utils/validators'

interface Props {
  open: boolean
  currentName: string
  isRenaming: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'rename': [newName: string]
  'cancel': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})
</script>
