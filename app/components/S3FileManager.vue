<template>
  <div :class="props.class">
    <div class="flex flex-1 overflow-hidden h-full border-t border-default">
      <!-- Left Sidebar (hidden on public page when there's only one bucket) -->
      <aside v-if="showBucketSidebar" class="w-64 flex flex-col overflow-hidden min-h-max ">
        <div class="flex-1 overflow-y-auto border-r border-default">
          <!-- Buckets Header -->
          <div class="p-4">
            <h2 class="font-semibold text-sm">Buckets</h2>
          </div>

          <!-- Buckets List -->
          <div v-if="props.selectedDestinationId || props.selectedDestinationSlug" class="px-2 pb-2">
            <div v-if="isLoadingBuckets" class="p-2 text-sm text-muted">Loading...</div>
            <div v-else-if="availableBuckets.length === 0" class="p-2 text-sm text-muted">No buckets</div>
            <div v-else class="space-y-1">
              <div v-for="bucket in availableBuckets" :key="bucket"
                class="group flex items-center gap-1 w-full rounded-md transition-colors"
                :class="{ 'bg-accented': selectedBucketName === bucket }">
                <button @click="handleBucketClick(bucket)"
                  class="flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-elevated min-w-0">
                  <UIcon name="i-heroicons-folder" class="w-4 h-4 text-primary shrink-0" />
                  <span class="truncate text-default">{{ bucket }}</span>
                  <UTooltip v-if="canRenameBucket" text="Rename bucket" class="ml-auto shrink-0">
                    <UButton variant="ghost" color="neutral" icon="i-heroicons-pencil-square" size="xs"
                      class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      @click.stop="handleRenameBucketClick(bucket)" />
                  </UTooltip>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header Bar -->
        <header class="border-b border-default px-4 py-2 flex items-center justify-between bg-default">
          <div class="flex items-center gap-2 text-sm">
            <button v-if="selectedBucketName" @click="handleBreadcrumbClick(-1)"
              class="font-medium text-highlighted hover:text-primary transition-colors cursor-pointer">
              {{ selectedBucketName }}
            </button>
            <template v-if="pathParts.length > 0">
              <span v-for="(part, index) in pathParts" :key="index" class="flex items-center gap-2">
                <span class="text-muted">></span>
                <button @click="handleBreadcrumbClick(index)"
                  class="font-medium text-highlighted hover:text-primary transition-colors cursor-pointer">
                  {{ part }}
                </button>
              </span>
            </template>
          </div>

          <div class="flex items-center gap-2">
            <div v-if="(props.selectedDestinationId || props.selectedDestinationSlug) && selectedBucketName"
              class="px-2 py-2 flex items-center gap-2 bg-default">
              <UButton v-if="effectiveIsEditor" variant="outline" color="primary" size="sm" @click="showUpload = true">
                Upload file
              </UButton>
              <UButton v-if="effectiveIsEditor" variant="outline" color="primary" size="sm"
                @click="showCreateFolder = true">
                New folder
              </UButton>
            </div>
            <UButton variant="ghost" color="neutral"
              :icon="viewMode === 'grid' ? 'i-heroicons-squares-2x2' : 'i-heroicons-bars-3'" size="sm"
              @click="viewMode = viewMode === 'grid' ? 'list' : 'grid'" />
          </div>
        </header>

        <!-- File Content Area -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="(!props.selectedDestinationId && !props.selectedDestinationSlug) || !selectedBucketName"
            class="flex items-center justify-center h-full">
            <div class="text-center">
              <UIcon name="i-heroicons-server" class="w-16 h-16 mx-auto mb-4 text-muted" />
              <p class="text-muted">Select destination and bucket to start</p>
            </div>
          </div>

          <div v-else-if="isLoading" class="flex items-center justify-center h-full">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
          </div>

          <!-- List View -->
          <div v-else-if="viewMode === 'list' && tableRows.length > 0">
            <S3FileTable :data="tableRows" :is-editor="effectiveIsEditor" @select="handleSelect"
              @double-click="handleDoubleClick" @download="handleDownload" @preview="handlePreview"
              @delete="handleDelete" @delete-folder="handleDeleteFolder" @rename-folder="handleRenameFolder"
              @rename-file="handleRenameFile" />
          </div>

          <!-- Grid View -->
          <div v-else-if="viewMode === 'grid' && tableRows.length > 0" class="flex flex-wrap gap-2">
            <div v-for="row in tableRows" :key="(row as any).name"
              class="flex flex-col items-center p-2 py-4 hover:bg-elevated rounded-lg transition-colors group relative w-[calc(50%-0.25rem)] sm:w-[calc(33.333%-0.5rem)] md:w-[calc(25%-0.5rem)] lg:w-[calc(20%-0.5rem)] xl:w-[calc(16.666%-0.5rem)]">
              <button @click="handleSelect(row)" @dblclick="handleDoubleClick(row)"
                class="flex flex-col items-center w-full">
                <UIcon :name="(row as any).isFolder ? 'i-heroicons-folder' : getFileIcon(row as unknown as FileItem)"
                  class="w-12 h-12" :class="(row as any).isFolder ? 'text-primary' : 'text-muted'" />
                <span class="text-sm text-center truncate w-full text-highlighted">{{ (row as any).name }}</span>
                <div v-if="!(row as any).isFolder" class="text-xs text-muted">
                  {{ formatFileSize((row as any).Size) }}
                </div>
              </button>
              <div class="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <template v-if="(row as any).isFolder">
                  <UTooltip v-if="effectiveIsEditor" text="Rename">
                    <UButton variant="ghost" color="neutral" icon="i-heroicons-pencil-square" size="md"
                      class="cursor-pointer"
                      @click.stop="handleRenameFolder({ name: (row as any).name, Prefix: (row as any).Prefix })" />
                  </UTooltip>
                  <UTooltip v-if="effectiveIsEditor" text="Delete">
                    <UButton variant="ghost" color="error" icon="i-heroicons-trash" size="md" class="cursor-pointer"
                      @click.stop="handleDeleteFolder({ name: (row as any).name, Prefix: (row as any).Prefix })" />
                  </UTooltip>
                </template>
                <template v-else>
                  <UTooltip v-if="effectiveIsEditor" text="Rename">
                    <UButton variant="ghost" color="neutral" icon="i-heroicons-pencil-square" size="md"
                      class="cursor-pointer" @click.stop="handleRenameFile(row as unknown as FileItem)" />
                  </UTooltip>
                  <UTooltip text="Download">
                    <UButton variant="ghost" color="neutral" icon="i-heroicons-arrow-down-tray" size="md"
                      class="cursor-pointer" @click.stop="handleDownload(row as unknown as FileItem)" />
                  </UTooltip>
                  <UTooltip v-if="effectiveIsEditor" text="Delete">
                    <UButton variant="ghost" color="error" icon="i-heroicons-trash" size="md" class="cursor-pointer"
                      @click.stop="handleDelete(row as unknown as FileItem)" />
                  </UTooltip>
                </template>
              </div>
            </div>
          </div>

          <div v-else-if="tableRows.length === 0 && !isLoading" class="flex items-center justify-center h-full">
            <div class="text-center">
              <UIcon name="i-heroicons-folder-open" class="w-16 h-16 mx-auto mb-4 text-muted" />
              <p class="text-muted">This folder is empty</p>
            </div>
          </div>
        </div>

        <!-- Upload Button (Bottom Right) -->
        <div
          v-if="effectiveIsEditor && (props.selectedDestinationId || props.selectedDestinationSlug) && selectedBucketName"
          class="fixed bottom-6 right-6 z-50">
          <UButton icon="i-heroicons-arrow-up-tray" color="primary" size="lg" square @click="showUpload = true" />
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="uploadProgress.length > 0" class="fixed bottom-4 right-4 w-80 space-y-2 z-50">
        <UCard v-for="item in uploadProgress" :key="item.id" variant="outline">
          <div class="flex items-center gap-2">
            <UIcon :name="item.status === 'completed' ? 'i-heroicons-check-circle' :
              item.status === 'error' ? 'i-heroicons-x-circle' :
                'i-heroicons-arrow-up-tray'" :class="item.status === 'completed' ? 'text-success' :
                  item.status === 'error' ? 'text-error' :
                    'text-primary'" />
            <div class="flex-1 min-w-0">
              <p class="text-sm truncate text-highlighted">{{ item.file.name }}</p>
              <UProgress v-if="item.status === 'uploading'" :model-value="item.progress" size="xs" />
            </div>
            <span class="text-xs text-muted">{{ item.progress }}%</span>
          </div>
        </UCard>
      </div>
    </div>
  </div>

  <!-- Create Folder Modal -->
  <UModal v-model:open="showCreateFolder" title="Create New Folder" :ui="{ footer: 'justify-end gap-2' }">
    <template #body>
      <UFormField label="Folder Name" required>
        <UInput v-model="newFolderName" placeholder="Enter folder name" @keyup.enter="handleCreateFolder"
          class="w-full" />
      </UFormField>
    </template>
    <template #footer="{ close }">
      <UButton variant="outline" color="neutral" label="Cancel" @click="close" />
      <UButton color="primary" :disabled="!newFolderName" :loading="isCreatingFolder" @click="handleCreateFolder"
        label="Create" />
    </template>
  </UModal>

  <!-- Upload Modal -->
  <UModal v-model:open="showUpload" title="Upload Files">
    <template #body>
      <div v-if="uploadProgress.length === 0" class="border-2 border-dashed border-accented rounded-lg p-8 text-center"
        @drop.prevent="handleDrop" @dragover.prevent>
        <UIcon name="i-heroicons-cloud-arrow-up" class="w-12 h-12 mx-auto mb-4 text-muted" />
        <p class="text-muted mb-4">
          Drag and drop files here, or click to browse
        </p>
        <UInput type="file" multiple @change="handleFileSelect" />
      </div>

      <!-- Upload Progress List -->
      <div v-else class="space-y-3 max-h-[400px] overflow-y-auto">
        <div v-for="item in uploadProgress" :key="item.id"
          class="flex items-center gap-3 p-3 border border-default rounded-lg">
          <UIcon :name="item.status === 'completed' ? 'i-heroicons-check-circle' :
            item.status === 'error' ? 'i-heroicons-x-circle' :
              'i-heroicons-arrow-up-tray'" :class="item.status === 'completed' ? 'text-success' :
                item.status === 'error' ? 'text-error' :
                  'text-primary animate-pulse'" class="w-5 h-5 shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate text-highlighted">{{ item.file.name }}</p>
            <div v-if="item.status === 'uploading'" class="mt-2">
              <UProgress :model-value="item.progress" size="sm" />
            </div>
            <p v-else-if="item.status === 'completed'" class="text-xs text-success mt-1">Upload completed</p>
            <p v-else-if="item.status === 'error'" class="text-xs text-error mt-1">{{ item.error || 'Upload failed' }}
            </p>
          </div>
          <span v-if="item.status === 'uploading'" class="text-xs text-muted font-medium whitespace-nowrap">{{
            item.progress }}%</span>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton variant="outline" color="neutral" block
        :disabled="uploadProgress.length > 0 && uploadProgress.some(item => item.status === 'uploading')"
        @click="close">
        {{uploadProgress.length > 0 && uploadProgress.some(item => item.status === 'uploading') ? 'Uploading...' :
          'Close'}}
      </UButton>
    </template>
  </UModal>

  <!-- Delete Folder Modal -->
  <UModal v-model:open="showDeleteFolderConfirm" title="Delete folder" :ui="{ footer: 'justify-end gap-2' }">
    <template #body>
      <div v-if="isCheckingFolder" class="flex items-center gap-2 py-4">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-primary" />
        <span class="text-muted">Checking folder contents...</span>
      </div>
      <div v-else>
        <p class="text-default mb-2">
          Are you sure you want to delete <span class="font-semibold">{{ folderToDelete?.name }}</span>?
        </p>
        <p v-if="folderContentsCount > 0" class="text-warning text-sm">
          This folder contains {{ folderContentsCount }} item(s). All contents will be permanently deleted.
        </p>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton variant="outline" color="neutral" label="Cancel" :disabled="isDeletingFolder"
        @click="folderToDelete = null; close()" />
      <UButton color="error" :loading="isDeletingFolder" :disabled="isCheckingFolder" label="Delete"
        @click="confirmDeleteFolder" />
    </template>
  </UModal>

  <!-- Rename Folder Modal -->
  <UModal v-model:open="showRenameFolder" title="Rename folder" :ui="{ footer: 'justify-end gap-2' }">
    <template #body>
      <UFormField label="Folder name" required>
        <UInput v-model="renameFolderName" placeholder="Enter new folder name" @keyup.enter="confirmRenameFolder"
          class="w-full" />
      </UFormField>
    </template>
    <template #footer="{ close }">
      <UButton variant="outline" color="neutral" label="Cancel" :disabled="isRenamingFolder"
        @click="folderToRename = null; close()" />
      <UButton color="primary" :loading="isRenamingFolder" :disabled="!renameFolderName.trim()" label="Rename"
        @click="confirmRenameFolder" />
    </template>
  </UModal>

  <!-- Rename File Modal -->
  <UModal v-model:open="showRenameFile" title="Rename file" :ui="{ footer: 'justify-end gap-2' }">
    <template #body>
      <UFormField label="File name" required>
        <UInput v-model="renameFileName" placeholder="Enter new file name" @keyup.enter="confirmRenameFile"
          class="w-full" />
      </UFormField>
    </template>
    <template #footer="{ close }">
      <UButton variant="outline" color="neutral" label="Cancel" :disabled="isRenamingFile"
        @click="fileToRename = null; close()" />
      <UButton color="primary" :loading="isRenamingFile" :disabled="!renameFileName.trim()" label="Rename"
        @click="confirmRenameFile" />
    </template>
  </UModal>

  <!-- Rename Bucket Modal (admin only) -->
  <UModal v-model:open="showRenameBucket" title="Rename bucket" :ui="{ footer: 'justify-end gap-2' }">
    <template #body>
      <UFormField label="New bucket name" required
        help="3-63 characters, lowercase letters, numbers, hyphens, periods. Must start and end with letter or number.">
        <UInput v-model="renameBucketName" placeholder="Enter new bucket name" @keyup.enter="confirmRenameBucket"
          class="w-full" />
      </UFormField>
      <p class="text-sm text-muted mt-2">
        All objects will be copied to the new bucket. This may take a while for large buckets.
      </p>
    </template>
    <template #footer="{ close }">
      <UButton variant="outline" color="neutral" label="Cancel" :disabled="isRenamingBucket"
        @click="bucketToRename = null; close()" />
      <UButton color="primary" :loading="isRenamingBucket"
        :disabled="!renameBucketName.trim() || renameBucketName.trim() === bucketToRename" label="Rename"
        @click="confirmRenameBucket" />
    </template>
  </UModal>

  <!-- Preview Modal -->
  <UModal v-model:open="showPreview" :title="previewItem?.name" :ui="{ content: 'max-w-4xl' }">
    <template #body>
      <div v-if="previewLoading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <div v-else-if="previewUrl || previewTextContent !== null" class="flex justify-center">
        <img v-if="previewItem && isImage(previewItem) && previewUrl" :src="previewUrl"
          class="max-h-[60vh] object-contain" :alt="previewItem.name">
        <iframe v-else-if="previewItem && isPDF(previewItem) && previewUrl" :src="previewUrl" class="w-full h-[60vh]" />
        <div v-else-if="previewItem && isTextFile(previewItem) && previewTextContent !== null"
          class="w-full max-h-[60vh] overflow-auto">
          <pre
            class="p-4 bg-elevated rounded-lg text-sm text-highlighted font-mono whitespace-pre-wrap wrap-break-word"><code>{{ previewTextContent }}</code></pre>
        </div>
        <div v-else class="text-center py-12">
          <UIcon name="i-heroicons-document" class="w-16 h-16 mx-auto mb-4 text-muted" />
          <p class="text-muted">Preview not available for this file type</p>
          <UButton v-if="previewItem" color="primary" class="mt-4" @click="handleDownload(previewItem)">
            Download File
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { FileItem } from '../types'
import { getFileIcon, formatFileSize, isImage, isPDF, isTextFile, canPreview } from '../utils/fileUtils'

interface Props {
  selectedDestinationId?: string
  selectedDestinationSlug?: string
  selectedBucketName?: string
  readOnly?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
})

// Use composables based on mode
const isPublicMode = computed(() => !!props.selectedDestinationSlug)

// Hide bucket sidebar on public page when there's only one bucket
const showBucketSidebar = computed(() => {
  if (props.selectedDestinationSlug && availableBuckets.value.length === 1) return false
  return true
})

// Initialize both composables but use conditionally
const publicS3 = useS3({ isPublic: true })
const privateS3 = useS3({ isPublic: false })

// Select composable based on mode
const s3 = computed(() => isPublicMode.value ? publicS3 : privateS3)

const currentPath = computed(() => s3.value.currentPath.value)
const files = computed(() => s3.value.files.value)
const folders = computed(() => s3.value.folders.value)
const isLoading = computed(() => s3.value.isLoading.value)
const uploadProgress = computed(() => isPublicMode.value ? [] : s3.value.uploadProgress.value)

const fetchBuckets = async (identifier: string) => {
  return await s3.value.fetchBuckets(identifier)
}

const fetchFiles = async (identifier: string, bucketName: string, prefix: string = '') => {
  return await s3.value.fetchFiles(identifier, bucketName, prefix)
}

const navigateToFolder = async (folderName: string) => {
  await s3.value.navigateToFolder(folderName)
}

const downloadFile = async (key: string, filename: string) => {
  await s3.value.downloadFile(key, filename)
}

const uploadFile = async (file: File, path: string = '') => {
  if (isPublicMode.value || props.readOnly) return false
  return await s3.value.uploadFile(file, path)
}

const deleteFile = async (key: string) => {
  if (isPublicMode.value || props.readOnly) return false
  return await s3.value.deleteFile(key)
}

const createFolder = async (folderName: string) => {
  if (isPublicMode.value || props.readOnly) return false
  return await s3.value.createFolder(folderName)
}

const getFolderContentsCount = async (prefix: string) => {
  if (isPublicMode.value) return 0
  return await s3.value.getFolderContentsCount(prefix)
}

const deleteFolderByPrefix = async (prefix: string) => {
  if (isPublicMode.value || props.readOnly) return false
  return await s3.value.deleteFolder(prefix)
}

const renameFolderByPrefix = async (oldPrefix: string, newPrefix: string) => {
  if (isPublicMode.value || props.readOnly) return false
  return await s3.value.renameFolder(oldPrefix, newPrefix)
}

const renameFileByKey = async (oldKey: string, newKey: string) => {
  if (isPublicMode.value || props.readOnly) return false
  return await s3.value.renameFile(oldKey, newKey)
}

const getPreviewUrl = async (key: string): Promise<string | null> => {
  return await s3.value.getPreviewUrl(key)
}

const { isEditor, isAdmin } = props.readOnly ? { isEditor: computed(() => false), isAdmin: computed(() => false) } : useAuth()
const effectiveIsEditor = computed(() => !props.readOnly && isEditor.value)
const canRenameBucket = computed(() => !!props.selectedDestinationId && isAdmin.value && !props.readOnly)

// Internal state
const selectedBucketName = ref<string | undefined>(props.selectedBucketName)
const availableBuckets = ref<string[]>([])
const isLoadingBuckets = ref(false)
const viewMode = ref<'grid' | 'list'>('list')

const showUpload = ref(false)
const showPreview = ref(false)
const showCreateFolder = ref(false)
const previewItem = ref<FileItem | null>(null)
const previewUrl = ref<string | null>(null)
const previewTextContent = ref<string | null>(null)
const previewLoading = ref(false)
const isCreatingFolder = ref(false)
const newFolderName = ref('')

const showDeleteFolderConfirm = ref(false)
const folderToDelete = ref<{ name: string; Prefix: string } | null>(null)
const folderContentsCount = ref(0)
const isCheckingFolder = ref(false)
const isDeletingFolder = ref(false)

const showRenameFolder = ref(false)
const folderToRename = ref<{ name: string; Prefix: string } | null>(null)
const renameFolderName = ref('')
const isRenamingFolder = ref(false)

const showRenameFile = ref(false)
const fileToRename = ref<FileItem | null>(null)
const renameFileName = ref('')
const isRenamingFile = ref(false)

const showRenameBucket = ref(false)
const bucketToRename = ref<string | null>(null)
const renameBucketName = ref('')
const isRenamingBucket = ref(false)

const emit = defineEmits<{
  'bucket-click': [bucket: string]
  'update:selected-bucket-name': [bucket: string | undefined]
  'logout': []
}>()

const isUpdatingUrl = ref(false)
const router = useRouter()
const route = useRoute()

watch(() => props.selectedDestinationId || props.selectedDestinationSlug, async (identifier) => {
  if (!identifier) {
    selectedBucketName.value = undefined
    availableBuckets.value = []
    await nextTick()
    updateUrl()
    return
  }

  selectedBucketName.value = undefined

  isLoadingBuckets.value = true
  try {
    const buckets = props.selectedDestinationSlug
      ? await fetchBuckets(props.selectedDestinationSlug)
      : await fetchBuckets(identifier)
    availableBuckets.value = buckets

    if (buckets.length > 0 && !selectedBucketName.value) {
      selectedBucketName.value = buckets[0]
      await handleBucketChange(buckets[0])
    } else {
      await nextTick()
      updateUrl()
    }
  }
  catch (error) {
  }
  finally {
    isLoadingBuckets.value = false
  }
}, { immediate: true })

watch(() => props.selectedBucketName, (newBucket) => {
  if (newBucket !== selectedBucketName.value) {
    selectedBucketName.value = newBucket
  }
}, { immediate: true })

watch(selectedBucketName, async (bucketName) => {
  if (bucketName && (props.selectedDestinationId || props.selectedDestinationSlug) && !isUpdatingUrl.value) {
    await handleBucketChange(bucketName)
  }
}, { immediate: false })

const handleBucketChange = async (bucketName: string | null) => {
  if ((!props.selectedDestinationId && !props.selectedDestinationSlug) || !bucketName) {
    await nextTick()
    updateUrl()
    return
  }

  if (props.selectedDestinationSlug) {
    await fetchFiles(props.selectedDestinationSlug, bucketName, '')
  } else if (props.selectedDestinationId) {
    await fetchFiles(props.selectedDestinationId, bucketName, '')
  }
  await nextTick()
  updateUrl()
}

const updateUrl = () => {
  if (isUpdatingUrl.value) return
  if ((!props.selectedDestinationId && !props.selectedDestinationSlug) || !selectedBucketName.value) return
  if (props.selectedDestinationId && !props.selectedDestinationSlug) return

  const currentQuery = route.query
  const identifier = props.selectedDestinationId || props.selectedDestinationSlug
  const needsUpdate =
    (props.selectedDestinationId && currentQuery.destinationId !== props.selectedDestinationId) ||
    (props.selectedDestinationSlug && currentQuery.slug !== props.selectedDestinationSlug) ||
    currentQuery.path !== currentPath.value

  if (!needsUpdate) return

  isUpdatingUrl.value = true

  const query: Record<string, string> = {}

  if (props.selectedDestinationId) {
    query.destinationId = props.selectedDestinationId
  }
  if (props.selectedDestinationSlug) {
    query.slug = props.selectedDestinationSlug
  }

  if (currentPath.value) {
    query.path = currentPath.value
  }

  if (props.selectedDestinationSlug) {
    const themeParams = ['primary', 'neutral', 'theme'] as const
    for (const key of themeParams) {
      const val = currentQuery[key] as string | undefined
      if (val) query[key] = val
    }
  }

  nextTick(() => {
    router.replace({ query }).finally(() => {
      isUpdatingUrl.value = false
    })
  })
}

const pathParts = computed(() => {
  return currentPath.value.split('/').filter(Boolean)
})

const tableRows = computed(() => {
  const folderRows = folders.value.map(f => ({
    ...f,
    isFolder: true,
    Size: 0,
    LastModified: new Date()
  }))

  return [...folderRows, ...files.value]
})

const handleBucketClick = async (bucketName: string) => {
  selectedBucketName.value = bucketName
  emit('update:selected-bucket-name', bucketName)
  await handleBucketChange(bucketName)
}

const handleBreadcrumbClick = async (index: number) => {
  if ((!props.selectedDestinationId && !props.selectedDestinationSlug) || !selectedBucketName.value) return

  if (index === -1) {
    if (props.selectedDestinationSlug) {
      await fetchFiles(props.selectedDestinationSlug, selectedBucketName.value, '')
    } else if (props.selectedDestinationId) {
      await fetchFiles(props.selectedDestinationId, selectedBucketName.value, '')
    }
    await nextTick()
    updateUrl()
    return
  }

  const targetPathParts = pathParts.value.slice(0, index + 1)
  const targetPath = targetPathParts.length > 0 ? targetPathParts.join('/') + '/' : ''

  if (props.selectedDestinationSlug) {
    await fetchFiles(props.selectedDestinationSlug, selectedBucketName.value, targetPath)
  } else if (props.selectedDestinationId) {
    await fetchFiles(props.selectedDestinationId, selectedBucketName.value, targetPath)
  }
  await nextTick()
  updateUrl()
}

watch(selectedBucketName, (newBucket) => {
  emit('update:selected-bucket-name', newBucket)
})

watch(uploadProgress, (progress) => {
  if (showUpload.value && progress.length > 0) {
    const hasActiveUploads = progress.some(item => item.status === 'uploading')
    if (!hasActiveUploads) {
      setTimeout(() => {
        if (!uploadProgress.value.some(item => item.status === 'uploading')) {
          showUpload.value = false
        }
      }, 2000)
    }
  }
}, { deep: true })

const handleSelect = async (row: any) => {
  if ((row as any).isFolder) {
    await navigateToFolder((row as any).name)
    await nextTick()
    updateUrl()
  }
}

const handleDoubleClick = async (row: any) => {
  if ((row as any).isFolder) {
    await handleSelect(row)
  } else if (canPreview(row as unknown as FileItem)) {
    await handlePreview(row as unknown as FileItem)
  }
}

const handleDownload = async (file: FileItem) => {
  const key = currentPath.value + file.name
  await downloadFile(key, file.name)
}

const handlePreview = async (file: FileItem) => {
  previewItem.value = file
  showPreview.value = true
  previewLoading.value = true
  previewTextContent.value = null
  previewUrl.value = null

  const key = currentPath.value + file.name

  if (isTextFile(file)) {
    try {
      const url = await getPreviewUrl(key)
      if (url) {
        const response = await fetch(url)
        if (response.ok) {
          const text = await response.text()
          previewTextContent.value = text
        } else {
          previewTextContent.value = 'Failed to load file content'
        }
      }
    }
    catch (error) {
      previewTextContent.value = 'Error loading file content'
    }
  } else {
    const url = await getPreviewUrl(key)
    previewUrl.value = url
  }

  previewLoading.value = false
}

const handleDelete = async (file: FileItem) => {
  if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
    return
  }

  const key = currentPath.value + file.name
  await deleteFile(key)
}

const handleDeleteFolder = async (folder: { name: string; Prefix: string }) => {
  folderToDelete.value = folder
  isCheckingFolder.value = true
  folderContentsCount.value = 0
  showDeleteFolderConfirm.value = true
  try {
    folderContentsCount.value = await getFolderContentsCount(folder.Prefix)
  }
  finally {
    isCheckingFolder.value = false
  }
}

const confirmDeleteFolder = async () => {
  if (!folderToDelete.value) return
  isDeletingFolder.value = true
  const success = await deleteFolderByPrefix(folderToDelete.value.Prefix)
  isDeletingFolder.value = false
  if (success) {
    showDeleteFolderConfirm.value = false
    folderToDelete.value = null
    folderContentsCount.value = 0
  }
}

const handleRenameFolder = (folder: { name: string; Prefix: string }) => {
  folderToRename.value = folder
  renameFolderName.value = folder.name
  showRenameFolder.value = true
}

const confirmRenameFolder = async () => {
  if (!folderToRename.value || !renameFolderName.value.trim()) return
  if (renameFolderName.value.trim() === folderToRename.value.name) {
    showRenameFolder.value = false
    folderToRename.value = null
    return
  }
  const parentPath = folderToRename.value.Prefix.replace(/[^/]+\/$/, '')
  const newPrefix = parentPath + renameFolderName.value.trim() + '/'
  isRenamingFolder.value = true
  const success = await renameFolderByPrefix(folderToRename.value.Prefix, newPrefix)
  isRenamingFolder.value = false
  if (success) {
    showRenameFolder.value = false
    folderToRename.value = null
    renameFolderName.value = ''
  }
}

const handleRenameFile = (file: FileItem) => {
  fileToRename.value = file
  renameFileName.value = file.name
  showRenameFile.value = true
}

const handleRenameBucketClick = (bucketName: string) => {
  bucketToRename.value = bucketName
  renameBucketName.value = bucketName
  showRenameBucket.value = true
}

const confirmRenameBucket = async () => {
  if (!bucketToRename.value || !props.selectedDestinationId || !renameBucketName.value.trim()) return
  const oldName = bucketToRename.value
  const newName = renameBucketName.value.trim()
  if (newName === oldName) {
    showRenameBucket.value = false
    bucketToRename.value = null
    return
  }
  isRenamingBucket.value = true
  const success = await privateS3.renameBucket(props.selectedDestinationId, oldName, newName)
  isRenamingBucket.value = false
  if (success) {
    showRenameBucket.value = false
    bucketToRename.value = null
    renameBucketName.value = ''
    if (selectedBucketName.value === oldName) {
      selectedBucketName.value = newName
    }
    const idx = availableBuckets.value.indexOf(oldName)
    if (idx >= 0) {
      availableBuckets.value = [...availableBuckets.value.slice(0, idx), newName, ...availableBuckets.value.slice(idx + 1)]
    }
    await handleBucketChange(newName)
  }
}

const confirmRenameFile = async () => {
  if (!fileToRename.value || !renameFileName.value.trim()) return
  if (renameFileName.value.trim() === fileToRename.value.name) {
    showRenameFile.value = false
    fileToRename.value = null
    return
  }
  const oldKey = currentPath.value + fileToRename.value.name
  const newKey = currentPath.value + renameFileName.value.trim()
  isRenamingFile.value = true
  const success = await renameFileByKey(oldKey, newKey)
  isRenamingFile.value = false
  if (success) {
    showRenameFile.value = false
    fileToRename.value = null
    renameFileName.value = ''
  }
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    const files = Array.from(input.files)
    Promise.all(files.map(file => uploadFile(file, currentPath.value)))
      .catch(() => {
      })
    input.value = ''
  }
}

const handleDrop = async (event: DragEvent) => {
  if (event.dataTransfer?.files) {
    const files = Array.from(event.dataTransfer.files)
    Promise.all(files.map(file => uploadFile(file, currentPath.value)))
      .catch(() => {
      })
  }
}

const handleCreateFolder = async () => {
  if (!newFolderName.value) return

  isCreatingFolder.value = true
  const success = await createFolder(newFolderName.value)
  isCreatingFolder.value = false

  if (success) {
    showCreateFolder.value = false
    newFolderName.value = ''
  }
}
</script>
