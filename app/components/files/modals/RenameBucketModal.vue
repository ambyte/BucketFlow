<template>
  <BaseRenameModal
    v-model:open="isOpen"
    title="Rename Bucket"
    label="New Bucket Name"
    :current-name="props.currentName"
    :is-renaming="props.isRenaming"
    action-label="Rename"
    :validate="validateBucketName"
    help="3-63 characters, lowercase letters, numbers, hyphens, periods. Must start and end with letter or number."
    @submit="$emit('rename', $event)"
  >
    <template #additional-info>
      <p class="text-sm text-muted mt-2">
        All objects will be copied to the new bucket. This may take a while for
        large buckets.
      </p>
    </template>
  </BaseRenameModal>
</template>

<script setup lang="ts">
import { isValidS3BucketName } from '../../../utils/validators'

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

const validateBucketName = (name: string) => isValidS3BucketName(name)
</script>
