<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :ui="{ footer: 'justify-end gap-2' }"
  >
    <template #body>
      <UFormField
        :label="label"
        :help="help"
        :required="required"
      >
        <UInput
          v-model="value"
          :placeholder="placeholder"
          class="w-full"
          :maxlength="maxLength"
          @keyup.enter="submit"
        />
      </UFormField>
      <slot name="additional-info" />
    </template>
    <template #footer="{ close }">
      <UButton
        variant="outline"
        color="neutral"
        :disabled="isRenaming"
        @click="handleClose(close)"
      >
        Cancel
      </UButton>
      <UButton
        color="primary"
        :loading="isRenaming"
        :disabled="!isValid"
        @click="submit"
      >
        {{ actionLabel }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface Props {
  open: boolean
  title: string
  label: string
  currentName: string
  isRenaming: boolean
  placeholder?: string
  help?: string
  required?: boolean
  maxLength?: number
  actionLabel?: string
  validate?: (name: string) => boolean
  errorMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Enter name',
  required: true,
  maxLength: 255,
  actionLabel: 'Save'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [name: string]
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const value = ref(props.currentName)

watch(
  () => props.open,
  (newValue) => {
    if (newValue) {
      value.value = props.currentName
    }
  }
)

watch(
  () => props.currentName,
  (newName) => {
    if (!isOpen.value) {
      value.value = newName
    }
  }
)

const isValid = computed(() => {
  const trimmedValue = value.value.trim()
  if (props.required && !trimmedValue) return false
  if (trimmedValue.length > props.maxLength) return false
  if (props.validate) {
    return props.validate(trimmedValue)
  }
  return true
})

const submit = () => {
  const trimmedValue = value.value.trim()
  if (!isValid.value) return
  emit('submit', trimmedValue)
}

const handleClose = (close: () => void) => {
  close()
}
</script>
