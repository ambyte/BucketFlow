<template>
  <UModal
    v-model:open="isOpen"
    title="Delete Bucket"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template #body>
      <p class="text-default mb-2">
        Are you sure you want to delete
        <span class="font-semibold">{{ bucketName }}</span>?
      </p>
      <p class="text-warning text-sm mb-4">
        All objects in this bucket will be permanently deleted. Public links to
        this bucket will be removed. This cannot be undone.
      </p>
      <UFormField
        label="Type the bucket name to confirm"
        required
      >
        <UInput
          v-model="confirmation"
          :placeholder="bucketName"
          autocomplete="off"
          :disabled="isDeleting"
          @keyup.enter="tryConfirm"
        />
      </UFormField>
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
        :disabled="!canConfirm"
        label="Delete"
        @click="$emit('confirm')"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  open: boolean
  bucketName: string
  isDeleting: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const confirmation = ref('')

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const canConfirm = computed(
  () => confirmation.value === props.bucketName && !!props.bucketName
)

const tryConfirm = () => {
  if (canConfirm.value && !props.isDeleting) emit('confirm')
}

watch(
  () => [props.open, props.bucketName] as const,
  () => {
    confirmation.value = ''
  }
)
</script>
