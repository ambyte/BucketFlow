<template>
  <BaseRenameModal
    v-model:open="isOpen"
    title="Rename File"
    label="File Name"
    :current-name="props.currentName"
    :is-renaming="props.isRenaming"
    action-label="Rename"
    @submit="$emit('rename', $event)"
  />
</template>

<script setup lang="ts">
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
