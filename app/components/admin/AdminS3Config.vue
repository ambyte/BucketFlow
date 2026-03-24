<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-database"
            class="w-5 h-5"
          />
          <h3 class="text-lg font-semibold">
            S3 Destinations
          </h3>
        </div>
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          @click="openAddModal"
        >
          Add Destination
        </UButton>
      </div>
    </template>

    <div>
      <p
        v-if="destinations.length === 0"
        class="text-lg text-center text-gray-500 dark:text-gray-400"
      >
        Add your providers like AWS S3, Cloudflare R2, Wasabi, DigitalOcean
        Spaces etc.
      </p>

      <div
        v-else
        class="grid gap-4"
      >
        <UCard
          v-for="destination in destinations"
          :key="destination.id"
          class="relative"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="text-lg font-semibold mb-1">
                {{ destination.name }}
              </h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Created at: {{ formatDate(destination.createdAt) }}
              </p>
            </div>
            <div class="flex gap-2 mt-2">
              <UButton
                variant="ghost"
                icon="i-heroicons-pencil"
                size="lg"
                @click="openEditModal(destination)"
              />
              <UButton
                variant="ghost"
                icon="i-heroicons-trash"
                size="lg"
                color="error"
                @click="confirmDelete(destination)"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Add/Edit Destination Modal -->
    <UModal
      v-model:open="showModal"
      :title="isEditing ? 'Update Destination' : 'Add Destination'"
      description="In this section, you can configure and add new S3 destinations for your backups. Please ensure that you provide the correct information"
    >
      <template #body>
        <UForm
          :state="destinationForm"
          class="space-y-3"
          @submit="saveDestination"
        >
          <UFormField
            label="Name"
            name="name"
            required
          >
            <UInput
              v-model="destinationForm.name"
              placeholder="S3 Server"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Access Key Id"
            name="accessKeyId"
            required
          >
            <UInput
              v-model="destinationForm.accessKeyId"
              placeholder="Enter access key ID"
              :type="showAccessKey ? 'text' : 'password'"
              :ui="{ trailing: 'pe-1' }"
              class="w-full"
              autocomplete="new-password"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showAccessKey ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="
                    showAccessKey ? 'Hide password' : 'Show password'
                  "
                  :aria-pressed="showAccessKey"
                  aria-controls="password"
                  @click="showAccessKey = !showAccessKey"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            label="Secret Access Key"
            name="secretAccessKey"
            required
          >
            <UInput
              v-model="destinationForm.secretAccessKey"
              placeholder="Enter secret access key"
              :type="showSecretAccessKey ? 'text' : 'password'"
              :ui="{ trailing: 'pe-1' }"
              class="w-full"
              autocomplete="new-password"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="
                    showSecretAccessKey ? 'i-lucide-eye-off' : 'i-lucide-eye'
                  "
                  :aria-label="
                    showSecretAccessKey ? 'Hide password' : 'Show password'
                  "
                  :aria-pressed="showSecretAccessKey"
                  aria-controls="password"
                  @click="showSecretAccessKey = !showSecretAccessKey"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            label="Buckets"
            name="bucketName"
          >
            <UInput
              v-model="bucketNamesString"
              placeholder="bucket1 bucket2 bucket3"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Metadata columns (for table)"
            name="metadataColumns"
          >
            <UInput
              v-model="metadataColumnsString"
              placeholder="description author project"
              class="w-full"
            />
            <template #help>
              <span class="text-xs text-muted">Space-separated metadata key names to display as columns in the
                file table.</span>
            </template>
          </UFormField>

          <UFormField
            label="Region"
            name="region"
          >
            <UInput
              v-model="destinationForm.region"
              placeholder="us-east-1"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Endpoint"
            name="endpoint"
            required
          >
            <UInput
              v-model="destinationForm.endpoint"
              placeholder="https://s3.amazonaws.com"
              class="w-full"
            />
          </UFormField>

          <UFormField name="forcePathStyle">
            <UCheckbox
              v-model="destinationForm.forcePathStyle"
              label="Force Path Style (for MinIO, etc.)"
              class="w-full"
            />
          </UFormField>

          <USeparator />

          <UFormField
            label="Allowed Users"
            name="allowedUserIds"
          >
            <USelectMenu
              v-model="destinationForm.allowedUserIds"
              class="w-full"
              :items="userOptions"
              value-key="value"
              :search-input="false"
              multiple
              :placeholder="
                destinationForm.allowedUserIds.length > 0
                  ? `${destinationForm.allowedUserIds.length} user(s) selected`
                  : 'No users selected (admin only)'
              "
            />
            <template #help>
              <span class="text-xs text-gray-500">Leave empty to allow only admins. Selected users will have
                access to this destination.</span>
            </template>
          </UFormField>

          <UFormField name="allowPublicAccess">
            <UCheckbox
              v-model="destinationForm.allowPublicAccess"
              label="Allowed anonymous access and public link creation"
              class="w-full"
            />
            <template #help>
              <span class="text-xs text-gray-500">When enabled, anyone can view via public links. Admin and
                editors can create links to buckets or folders.</span>
            </template>
          </UFormField>
        </UForm>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-between w-full">
          <UButton
            type="button"
            variant="soft"
            :loading="isTesting"
            @click="testConnection"
          >
            <template #leading>
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-4 h-4"
              />
            </template>
            Test Connection
          </UButton>

          <div class="flex gap-2">
            <UButton
              variant="ghost"
              @click="close"
            >
              Cancel
            </UButton>
            <UButton
              type="button"
              color="primary"
              :loading="isSaving"
              :disabled="!isValidForm"
              @click="saveDestination"
            >
              {{ isEditing ? "Update" : "Add" }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import type { S3Destination, User } from '../../types'
import {
  isValidS3BucketName,
  isValidUrl
} from '../../utils/validators'
import { useErrorHandler } from '../../composables/useErrorHandler'

const toast = useToast()
const { handle: handleError, success: handleSuccess } = useErrorHandler()
const { apiCall } = useAuth()

const destinations = ref<Omit<S3Destination, 'secretAccessKey'>[]>([])
const users = ref<User[]>([])
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const isTesting = ref(false)
const isSaving = ref(false)
const showAccessKey = ref(false)
const showSecretAccessKey = ref(false)

const destinationForm = reactive<
  Omit<S3Destination, 'id' | 'createdAt' | 'updatedAt'>
>({
  name: '',
  region: '',
  endpoint: '',
  accessKeyId: '',
  secretAccessKey: '',
  bucketNames: [],
  forcePathStyle: true,
  allowPublicAccess: false,
  allowedUserIds: [],
  metadataColumns: []
})

const userOptions = computed(() => {
  return users.value
    .filter(user => user.role === 'editor')
    .map(user => ({
      label: user.username,
      value: user.id,
      badge: {
        color: 'warning',
        variant: 'soft'
      }
    }))
})

const bucketNamesString = computed({
  get: () => {
    return destinationForm.bucketNames.filter(name => name.trim()).join(' ')
  },
  set: (value: string) => {
    destinationForm.bucketNames = value
      .split(/\s+/)
      .map(name => name.trim())
      .filter(name => name.length > 0)
  }
})

const metadataColumnsString = computed({
  get: () => {
    return (destinationForm.metadataColumns ?? [])
      .filter(k => k.trim())
      .join(' ')
  },
  set: (value: string) => {
    destinationForm.metadataColumns = value
      .split(/\s+/)
      .map(k => k.trim())
      .filter(k => k.length > 0)
  }
})

const isValidForm = computed(() => {
  if (!destinationForm.name) return false
  if (!destinationForm.endpoint || !destinationForm.accessKeyId) return false
  if (!destinationForm.secretAccessKey) return false
  if (!isValidUrl(destinationForm.endpoint)) return false
  if (destinationForm.bucketNames.length > 0) {
    return destinationForm.bucketNames.every(name =>
      isValidS3BucketName(name)
    )
  }
  return true
})

const resetForm = () => {
  destinationForm.name = ''
  destinationForm.region = ''
  destinationForm.endpoint = ''
  destinationForm.accessKeyId = ''
  destinationForm.secretAccessKey = ''
  destinationForm.bucketNames = []
  destinationForm.forcePathStyle = true
  destinationForm.allowedUserIds = []
  destinationForm.allowPublicAccess = false
  destinationForm.metadataColumns = []
  isEditing.value = false
  editingId.value = null
}

const openAddModal = () => {
  resetForm()
  showModal.value = true
}

const openEditModal = async (
  destination: Omit<S3Destination, 'secretAccessKey'>
) => {
  try {
    const response = await apiCall(`/api/admin/destinations/${destination.id}`)

    if (!response || !response.destination) {
      throw new Error('Invalid response from server')
    }

    const fullDestination = response.destination

    destinationForm.name = fullDestination.name
    destinationForm.region = fullDestination.region || ''
    destinationForm.endpoint = fullDestination.endpoint
    destinationForm.accessKeyId = fullDestination.accessKeyId
    destinationForm.secretAccessKey = fullDestination.secretAccessKey
    destinationForm.bucketNames = fullDestination.bucketNames || []
    destinationForm.forcePathStyle = fullDestination.forcePathStyle ?? true
    destinationForm.allowedUserIds = fullDestination.allowedUserIds || []
    destinationForm.allowPublicAccess
      = fullDestination.allowPublicAccess ?? false
    destinationForm.metadataColumns = fullDestination.metadataColumns || []
    isEditing.value = true
    editingId.value = destination.id
    showModal.value = true
  } catch (error: any) {
    console.error('Error loading destination:', error)
    toast.add({
      title: 'Error',
      description:
        error?.data?.statusMessage
        || error?.message
        || 'Failed to load destination',
      color: 'error'
    })
  }
}

const testConnection = async () => {
  isTesting.value = true

  try {
    const config = {
      region: destinationForm.region,
      endpoint: destinationForm.endpoint,
      accessKeyId: destinationForm.accessKeyId,
      secretAccessKey: destinationForm.secretAccessKey,
      forcePathStyle: destinationForm.forcePathStyle
    }

    const result = await apiCall('/api/destinations/test', {
      method: 'POST',
      body: JSON.stringify(config)
    })
    if (result.success) {
      handleSuccess('Connection established successfully', 'Success')
    } else {
      handleError(result.message || 'Connection failed', 'Connection Error')
    }
  } catch (error: any) {
    handleError(error, 'Connection Error')
  }

  isTesting.value = false
}

const saveDestination = async () => {
  if (!isValidForm.value) return

  isSaving.value = true

  try {
    if (isEditing.value && editingId.value) {
      await apiCall(`/api/admin/destinations/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(destinationForm)
      })

      handleSuccess('Destination updated', 'Success')
    } else {
      await apiCall('/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify(destinationForm)
      })

      handleSuccess('Destination created', 'Success')
    }

    showModal.value = false
    resetForm()
    await fetchDestinations()
  } catch (error: any) {
    handleError(error, 'Save Error')
  }

  isSaving.value = false
}

const confirmDelete = async (
  destination: Omit<S3Destination, 'secretAccessKey'>
) => {
  const confirmed = confirm(
    `Are you sure you want to delete "${destination.name}"?`
  )
  if (!confirmed) return

  try {
    await apiCall(`/api/admin/destinations/${destination.id}`, {
      method: 'DELETE'
    })

    handleSuccess('Destination deleted', 'Success')
    await fetchDestinations()
  } catch (error: any) {
    handleError(error, 'Delete Error')
  }
}

const fetchDestinations = async () => {
  try {
    const response = await apiCall('/api/admin/destinations')

    if (!response || !response.destinations) {
      throw new Error('Invalid response from server')
    }
    destinations.value = response.destinations as S3Destination[]
  } catch (error) {
    console.error('Failed to fetch destinations:', error)
  }
}

const fetchUsers = async () => {
  try {
    const response = await apiCall('/api/admin/users')
    users.value = response.users
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

onMounted(async () => {
  await Promise.all([fetchDestinations(), fetchUsers()])
})
</script>
