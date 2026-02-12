<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-2 flex items-center gap-4 shrink-0">
      <span class="font-medium text-xl whitespace-nowrap">S3 Destination</span>
      <USelect v-model="selectedDestinationId" :items="destinationOptions" placeholder="Select destination" size="lg"
        class="min-w-[280px]" @update:model-value="(value) => handleDestinationChange(value as string | null)" />
      <UButton v-if="isAdmin && selectedDestinationId" variant="solid" color="primary" icon="i-heroicons-plus"
        label="Create New Bucket" @click="showCreateBucket = true" />
      <UButton v-if="isAdmin && canShowPublicLink" variant="outline" color="primary" icon="i-heroicons-link" label="Public Link"
        @click="showPublicLinkModal = true" />
      <UModal v-model:open="showCreateBucket" title="Create New Bucket" :ui="{ footer: 'justify-end gap-2' }">
        <template #body>
          <UFormField label="Bucket Name">
            <UInput v-model="newBucketName" placeholder="Enter bucket name" @keyup.enter="handleCreateBucket"
              class="w-full" />
          </UFormField>
        </template>
        <template #footer="{ close }">
          <UButton variant="outline" color="neutral" label="Cancel" @click="close" />
          <UButton icon="i-heroicons-plus-circle" color="primary" :disabled="!newBucketName" :loading="isCreatingBucket"
            @click="handleCreateBucket" label="Create" />
        </template>
      </UModal>
      <PublicLinkModal v-model:open="showPublicLinkModal" :destination-slug="selectedDestination?.slug ?? ''"
        :bucket-name="selectedBucketName ?? ''" />
    </div>

    <S3FileManager :selected-destination-id="selectedDestinationId" v-model:selected-bucket-name="selectedBucketName"
      class="h-[calc(100vh-120px)]" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { isAdmin } = useAuth()
const {
  currentDestinationId,
  currentBucketName,
  availableDestinations,
  fetchAvailableDestinations,
  createBucket
} = useS3()

const selectedDestinationId = ref<string | undefined>(undefined)
const selectedBucketName = ref<string | undefined>(undefined)
const showCreateBucket = ref(false)
const newBucketName = ref('')
const isCreatingBucket = ref(false)
const showPublicLinkModal = ref(false)

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

const canShowPublicLink = computed(() => {
  return selectedDestination.value?.allowPublicAccess
})

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
