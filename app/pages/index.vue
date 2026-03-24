<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-2 flex items-center gap-4 shrink-0">
      <span class="font-medium text-xl whitespace-nowrap">S3 Destination</span>
      <USelect
        v-model="selectedDestinationId"
        :items="destinationOptions"
        placeholder="Select destination"
        size="lg"
        class="min-w-[280px]"
        @update:model-value="(value) => handleDestinationChange(value as string | null)"
      />
      <UButton
        v-if="isAdmin && selectedDestinationId"
        variant="solid"
        color="primary"
        icon="i-heroicons-plus"
        label="Create New Bucket"
        @click="showCreateBucket = true"
      />
      <UButton
        v-if="canShowManageLinks && selectedDestinationId"
        variant="outline"
        color="primary"
        icon="i-heroicons-link"
        label="Manage Public Links"
        @click="showPublicLinksModal = true"
      />
      <UModal
        v-model:open="showCreateBucket"
        title="Create New Bucket"
        :ui="{ footer: 'justify-end gap-2' }"
      >
        <template #body>
          <UFormField label="Bucket Name">
            <UInput
              v-model="newBucketName"
              placeholder="Enter bucket name"
              class="w-full"
              @keyup.enter="handleCreateBucket"
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
            icon="i-heroicons-plus-circle"
            color="primary"
            :disabled="!newBucketName"
            :loading="isCreatingBucket"
            label="Create"
            @click="handleCreateBucket"
          />
        </template>
      </UModal>
      <PublicLinksModal
        v-model:open="showPublicLinksModal"
        :destination-id="selectedDestinationId ?? undefined"
      />
    </div>

    <S3FileManager
      v-model:selected-bucket-name="selectedBucketName"
      :selected-destination-id="selectedDestinationId"
      :can-create-public-link="canCreatePublicLink"
      class="h-[calc(100vh-120px)]"
      @public-link-saved="onPublicLinkSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { isAdmin, isEditor } = useAuth()
const {
  currentDestinationId,
  currentBucketName,
  availableDestinations,
  fetchAvailableDestinations,
  createBucket
} = useAppContext()

const selectedDestinationId = ref<string | undefined>(undefined)
const selectedBucketName = ref<string | undefined>(undefined)
const showCreateBucket = ref(false)
const newBucketName = ref('')
const isCreatingBucket = ref(false)
const showPublicLinksModal = ref(false)

const destinationOptions = computed(() => {
  return availableDestinations.value.map(dest => ({
    label: dest.name,
    value: dest.id
  }))
})

const selectedDestination = computed(() => {
  if (!selectedDestinationId.value) return null
  return availableDestinations.value.find(d => d.id === selectedDestinationId.value) || null
})

const canShowManageLinks = computed(() => {
  return selectedDestination.value?.allowPublicAccess
})

const canCreatePublicLink = computed(() => {
  const dest = selectedDestination.value
  if (!dest?.allowPublicAccess) return false
  return isAdmin.value || isEditor.value
})

const onPublicLinkSaved = () => {
  // Could refresh PublicLinksModal if it's open - for now no-op, user can reopen
}

const handleDestinationChange = (destinationId: string | null) => {
  selectedBucketName.value = undefined
  if (!destinationId) return
}

const handleCreateBucket = async () => {
  if (!newBucketName.value || !selectedDestinationId.value) return

  isCreatingBucket.value = true
  const success = await createBucket(selectedDestinationId.value, newBucketName.value)
  isCreatingBucket.value = false

  if (success) {
    showCreateBucket.value = false
    newBucketName.value = ''
    await handleDestinationChange(selectedDestinationId.value)
  }
}

watch(currentDestinationId, (newId) => {
  if (newId !== selectedDestinationId.value) {
    selectedDestinationId.value = newId ?? undefined
  }
})

watch(currentBucketName, (newBucket) => {
  if (newBucket !== selectedBucketName.value) {
    selectedBucketName.value = newBucket ?? undefined
  }
})

onMounted(async () => {
  await fetchAvailableDestinations()

  if (availableDestinations.value.length > 0) {
    const firstDest = availableDestinations.value[0]
    if (firstDest) {
      selectedDestinationId.value = firstDest.id
      handleDestinationChange(firstDest.id)
    }
  }
})
</script>
