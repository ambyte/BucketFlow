<template>
  <div :class="props.class">
    <div class="flex flex-1 overflow-hidden h-full border-t border-default">
      <!-- Left Sidebar -->
      <BucketSidebar
        :show="showBucketSidebar"
        :buckets="availableBuckets"
        :selected-bucket="selectedBucketName"
        :loading="isLoadingBuckets"
        :can-rename="canRenameBucket"
        @select="handleBucketClick"
        @rename="handleRenameBucketClick"
      />

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Header Component -->
        <S3FileManagerHeader
          :selected-bucket-name="selectedBucketName"
          :path="currentPath"
          :has-identifier="hasIdentifier"
          :can-upload="canUpload"
          :can-create-folder="canCreateFolder"
          :can-create-public-link="canCreatePublicLink"
          :view-mode="viewMode"
          :selected-count="selectedIds.length"
          :zip-download-loading="zipDownloadLoading"
          @breadcrumb-click="handleBreadcrumbClick"
          @upload-click="showUpload = true"
          @create-folder-click="showCreateFolder = true"
          @public-link-click="showPublicLinkModal = true"
          @toggle-view="viewMode = viewMode === 'grid' ? 'list' : 'grid'"
          @download-selected="handleDownloadSelected"
        />

        <!-- Content Component -->
        <S3FileContent
          :has-identifier="hasIdentifier"
          :selected-bucket-name="selectedBucketName"
          :is-loading="isLoading"
          :view-mode="viewMode"
          :table-rows="tableRows"
          :is-editor="effectiveIsEditor"
          :is-public-mode="isPublicMode"
          :metadata-columns="[...metadataColumns]"
          :selected-ids="selectedIds"
          :select-all-checkbox-value="selectAllCheckboxValue"
          @select="handleSelect"
          @double-click="handleDoubleClick"
          @download="handleDownload"
          @preview="handlePreview"
          @delete="handleDelete"
          @delete-folder="handleDeleteFolder"
          @download-folder="handleDownloadFolder"
          @rename-folder="handleRenameFolder"
          @rename-file="handleRenameFile"
          @metadata="handleMetadata"
          @toggle-select="handleToggleSelect"
          @toggle-select-all="handleToggleSelectAll"
        />

        <!-- Upload Progress -->
        <div
          v-if="uploadProgress.length > 0"
          class="fixed bottom-4 right-4 w-80 space-y-2 z-50"
        >
          <UCard
            v-for="item in uploadProgress"
            :key="item.id"
            variant="outline"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="
                  item.status === 'completed'
                    ? 'i-heroicons-check-circle'
                    : item.status === 'error'
                      ? 'i-heroicons-x-circle'
                      : 'i-heroicons-arrow-up-tray'
                "
                :class="
                  item.status === 'completed'
                    ? 'text-success'
                    : item.status === 'error'
                      ? 'text-error'
                      : 'text-primary'
                "
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm truncate text-highlighted">
                  {{ item.file.name }}
                </p>
                <UProgress
                  v-if="item.status === 'uploading'"
                  :model-value="item.progress"
                  size="xs"
                />
              </div>
              <span class="text-xs text-muted">{{ item.progress }}%</span>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Upload Button (Bottom Right) -->
      <div
        v-if="canUpload && hasIdentifier && selectedBucketName"
        class="fixed bottom-6 right-6 z-50"
      >
        <UButton
          icon="i-heroicons-arrow-up-tray"
          color="primary"
          size="lg"
          square
          @click="showUpload = true"
        />
      </div>
    </div>

    <!-- Modals -->
    <CreateFolderModal
      v-model:open="showCreateFolder"
      :is-creating="isCreatingFolder"
      @create="handleCreateFolder"
    />
    <UploadModal
      v-model:open="showUpload"
      :upload-progress="[...(uploadProgress as UploadProgress[])]"
      @upload="handleFileSelect"
      @drop="handleDrop"
    />
    <DeleteFolderModal
      v-model:open="showDeleteFolderConfirm"
      :folder-name="folderToDelete?.name ?? ''"
      :prefix="folderToDelete?.Prefix ?? ''"
      :contents-count="folderContentsCount"
      :is-checking="isCheckingFolder"
      :is-deleting="isDeletingFolder"
      @confirm="confirmDeleteFolder"
      @cancel="folderToDelete = null"
    />
    <RenameFolderModal
      v-model:open="showRenameFolder"
      :current-name="folderToRename?.name ?? ''"
      :is-renaming="isRenamingFolder"
      @rename="confirmRenameFolderWithName"
      @cancel="folderToRename = null"
    />
    <RenameFileModal
      v-model:open="showRenameFile"
      :current-name="fileToRename?.name ?? ''"
      :is-renaming="isRenamingFile"
      @rename="confirmRenameFileWithName"
      @cancel="fileToRename = null"
    />
    <RenameBucketModal
      v-model:open="showRenameBucket"
      :current-name="bucketToRename ?? ''"
      :is-renaming="isRenamingBucket"
      @rename="confirmRenameBucketWithName"
      @cancel="bucketToRename = null"
    />
    <MetadataModal
      v-model:open="showMetadata"
      :file-name="metadataItem?.name ?? ''"
      :entries="metadataEntries"
      :loading="metadataLoading"
      :saving="metadataSaving"
      :readonly="metadataReadOnly"
      @update:entries="metadataEntries = $event"
      @save="handleSaveMetadata"
      @close="closeMetadata"
    />
    <PreviewModal
      v-model:open="showPreview"
      :file-name="previewItem?.name ?? ''"
      :preview-url="previewUrl"
      :text-content="previewTextContent"
      :loading="previewLoading"
      :is-image="previewItem ? isImage(previewItem) : false"
      :is-pdf="previewItem ? isPDF(previewItem) : false"
      :is-text="previewItem ? isTextFile(previewItem) : false"
      @download="previewItem && handleDownload(previewItem)"
    />
    <PublicLinkModal
      v-model:open="showPublicLinkModal"
      :destination-id="props.selectedDestinationId"
      :bucket-name="selectedBucketName ?? ''"
      :path="currentPath"
      @saved="onPublicLinkSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FileItem, FolderItem, TableRow, UploadProgress } from '../../types'
import { isImage, isPDF, isTextFile, canPreview } from '../../utils/fileUtils'
import { useErrorHandler } from '../../composables/useErrorHandler'

const { handle: handleError } = useErrorHandler()

interface Props {
  selectedDestinationId?: string
  selectedDestinationHash?: string
  selectedBucketName?: string
  readOnly?: boolean
  class?: string
  canCreatePublicLink?: boolean
  initialPath?: string
  allowUpload?: boolean
  allowFolderCreation?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  canCreatePublicLink: false,
  allowUpload: false,
  allowFolderCreation: false
})

const isPublicMode = computed(() => !!props.selectedDestinationHash)
const hasIdentifier = computed(
  () => !!(props.selectedDestinationId || props.selectedDestinationHash)
)
const showBucketSidebar = computed(() => {
  if (props.selectedDestinationHash && availableBuckets.value.length === 1)
    return false
  return true
})

const s3 = useAppContext({ isPublic: isPublicMode.value })
const currentPath = computed(() => s3.currentPath.value)
const files = computed(() => s3.files.value)
const folders = computed(() => s3.folders.value)
const metadataColumns = computed(() => s3.metadataColumns.value || [])
const isLoading = computed(() => s3.isLoading.value)
const uploadProgress = computed(() => s3.uploadProgress.value)

const { isEditor, isAdmin } = props.readOnly
  ? { isEditor: computed(() => false), isAdmin: computed(() => false) }
  : useAuth()
const effectiveIsEditor = computed(() => !props.readOnly && isEditor.value)
const canUpload = computed(
  () => effectiveIsEditor.value || (isPublicMode.value && props.allowUpload)
)
const canCreateFolder = computed(
  () =>
    effectiveIsEditor.value
    || (isPublicMode.value && props.allowFolderCreation)
)
const canRenameBucket = computed(
  () => !!props.selectedDestinationId && isAdmin.value && !props.readOnly
)

const selectedBucketName = ref<string | undefined>(props.selectedBucketName)
const availableBuckets = ref<string[]>([])
const isLoadingBuckets = ref(false)
const hasUsedInitialPath = ref(false)
const viewMode = ref<'grid' | 'list'>('list')

const showUpload = ref(false)
const showPreview = ref(false)
const showCreateFolder = ref(false)
const previewItem = ref<FileItem | null>(null)
const previewUrl = ref<string | null>(null)
const previewTextContent = ref<string | null>(null)
const previewLoading = ref(false)
const isCreatingFolder = ref(false)

const showDeleteFolderConfirm = ref(false)
const folderToDelete = ref<{ name: string, Prefix: string } | null>(null)
const folderContentsCount = ref(0)
const isCheckingFolder = ref(false)
const isDeletingFolder = ref(false)

const showRenameFolder = ref(false)
const folderToRename = ref<{ name: string, Prefix: string } | null>(null)
const isRenamingFolder = ref(false)

const showRenameFile = ref(false)
const fileToRename = ref<FileItem | null>(null)
const isRenamingFile = ref(false)

const showRenameBucket = ref(false)
const bucketToRename = ref<string | null>(null)
const isRenamingBucket = ref(false)

const showPublicLinkModal = ref(false)
const showMetadata = ref(false)
const metadataItem = ref<FileItem | null>(null)
const metadataEntries = ref<{ key: string, value: string }[]>([])
const metadataLoading = ref(false)
const metadataSaving = ref(false)
const metadataReadOnly = computed(() => isPublicMode.value || props.readOnly)

const emit = defineEmits<{
  'bucket-click': [bucket: string]
  'update:selected-bucket-name': [bucket: string | undefined]
  'logout': []
  'public-link-saved': []
}>()

const onPublicLinkSaved = () => {
  emit('public-link-saved')
}

const getIdentifier = () =>
  props.selectedDestinationHash || props.selectedDestinationId

watch(
  () => getIdentifier(),
  async (identifier) => {
    if (!identifier) {
      selectedBucketName.value = undefined
      availableBuckets.value = []
      hasUsedInitialPath.value = false
      return
    }

    const preserveBucket = isPublicMode.value && props.selectedBucketName
    if (!preserveBucket) selectedBucketName.value = undefined
    hasUsedInitialPath.value = false

    isLoadingBuckets.value = true
    try {
      const buckets = await s3.fetchBuckets(identifier)
      availableBuckets.value = buckets

      const bucketToUse
        = preserveBucket && buckets.includes(props.selectedBucketName!)
          ? props.selectedBucketName!
          : buckets.length > 0
            ? buckets[0]
            : null

      if (bucketToUse && !selectedBucketName.value) {
        selectedBucketName.value = bucketToUse
      }
    } catch (error) {
      handleError(error, 'Error loading buckets')
    } finally {
      isLoadingBuckets.value = false
    }
  },
  { immediate: true }
)

watch(
  () => props.selectedBucketName,
  (newBucket) => {
    if (newBucket !== selectedBucketName.value) {
      selectedBucketName.value = newBucket
    }
  },
  { immediate: true }
)

const handleBucketChange = async (
  bucketName: string | null,
  options: { goToRoot?: boolean } = {}
) => {
  const identifier = getIdentifier()
  if (!identifier || !bucketName) return

  const normalizedInitialPath = props.initialPath
    ? props.initialPath.endsWith('/')
      ? props.initialPath
      : `${props.initialPath}/`
    : ''
  const shouldUseInitialPath = (
    isPublicMode.value
    && !!normalizedInitialPath
    && !hasUsedInitialPath.value
    && !options.goToRoot
  )

  const targetPath = shouldUseInitialPath ? normalizedInitialPath : ''
  if (shouldUseInitialPath) hasUsedInitialPath.value = true
  await s3.fetchFiles(identifier, bucketName, targetPath)
}

watch(
  [selectedBucketName, () => getIdentifier()],
  async ([bucketName, identifier]) => {
    if (bucketName && identifier) {
      await handleBucketChange(bucketName)
    }
  },
  { immediate: true }
)

const pathParts = computed(() => currentPath.value.split('/').filter(Boolean))

const tableRows = computed<TableRow[]>(() => {
  const folderRows = folders.value.map((f: FolderItem) => ({
    ...f,
    isFolder: true,
    Size: 0,
    LastModified: new Date()
  }))
  return [...folderRows, ...files.value]
})

function rowSelectionId(row: TableRow): string {
  if (row.isFolder) {
    return row.Prefix ?? ''
  }
  return row.Key ?? ''
}

const selectedIds = ref<string[]>([])

const zipDownloadLoading = ref(false)

const selectAllCheckboxValue = computed(
  (): boolean | 'indeterminate' => {
    const n = selectedIds.value.length
    const t = tableRows.value.length
    if (t === 0) return false
    if (n === 0) return false
    if (n === t) return true
    return 'indeterminate'
  }
)

function handleToggleSelect(row: TableRow) {
  const id = rowSelectionId(row)
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) {
    selectedIds.value = selectedIds.value.filter(x => x !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function handleToggleSelectAll() {
  if (selectedIds.value.length === tableRows.value.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = tableRows.value.map(rowSelectionId)
  }
}

function folderNameFromPrefix(prefix: string): string {
  const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean)
  return parts.length ? parts[parts.length - 1]! : 'folder'
}

function currentListingFolderName(): string {
  const parts = currentPath.value.replace(/\/$/, '').split('/').filter(Boolean)
  return parts.length ? parts[parts.length - 1]! : ''
}

function zipArchiveBaseName(prefixes: string[], keys: string[]): string {
  const onlyOneFolderSelected = prefixes.length === 1 && keys.length === 0
  if (onlyOneFolderSelected) {
    return folderNameFromPrefix(prefixes[0]!)
  }
  const fromListing = currentListingFolderName()
  if (fromListing) return fromListing
  return selectedBucketName.value ?? 'download'
}

const handleDownloadSelected = async () => {
  const keys: string[] = []
  const prefixes: string[] = []
  for (const id of selectedIds.value) {
    const row = tableRows.value.find(r => rowSelectionId(r) === id)
    if (!row) continue
    if (row.isFolder) {
      const p = row.Prefix
      if (p) prefixes.push(p)
    } else {
      const k = (row as FileItem).Key
      if (k) keys.push(k)
    }
  }

  if (prefixes.length === 0 && keys.length === 1) {
    const key = keys[0]!
    const fileRow = tableRows.value.find(
      r => !r.isFolder && (r as FileItem).Key === key
    ) as FileItem | undefined
    if (fileRow) {
      await s3.downloadFile(key, fileRow.name)
      return
    }
  }

  const zipName = zipArchiveBaseName(prefixes, keys)
  zipDownloadLoading.value = true
  try {
    await s3.downloadZip(keys, prefixes, currentPath.value, `${zipName}.zip`)
  } finally {
    zipDownloadLoading.value = false
  }
}

watch([selectedBucketName, currentPath], () => {
  selectedIds.value = []
})

const handleBucketClick = async (bucketName: string) => {
  if (selectedBucketName.value === bucketName) {
    await handleBucketChange(bucketName, { goToRoot: true })
    return
  }
  hasUsedInitialPath.value = true
  selectedBucketName.value = bucketName
}

const handleBreadcrumbClick = async (index: number) => {
  const identifier = getIdentifier()
  if (!identifier || !selectedBucketName.value) return

  if (index === -1) {
    await s3.fetchFiles(identifier, selectedBucketName.value, '')
    return
  }

  const targetPathParts = pathParts.value.slice(0, index + 1)
  const targetPath
    = targetPathParts.length > 0 ? targetPathParts.join('/') + '/' : ''
  await s3.fetchFiles(identifier, selectedBucketName.value, targetPath)
}

watch(showMetadata, (open) => {
  if (!open) {
    metadataItem.value = null
    metadataEntries.value = []
  }
})

watch(selectedBucketName, (newBucket) => {
  emit('update:selected-bucket-name', newBucket)
})

watch(
  uploadProgress,
  (progress) => {
    if (showUpload.value && progress.length > 0) {
      const hasActiveUploads = progress.some(
        (item: { status: string }) => item.status === 'uploading'
      )
      if (!hasActiveUploads) {
        setTimeout(() => {
          if (
            !uploadProgress.value.some(
              (item: { status: string }) => item.status === 'uploading'
            )
          ) {
            showUpload.value = false
          }
        }, 2000)
      }
    }
  },
  { deep: true }
)

const handleSelect = async (row: TableRow) => {
  if (row.isFolder) {
    await s3.navigateToFolder(row.name)
  }
}

const handleDoubleClick = async (row: TableRow) => {
  if (row.isFolder) {
    await handleSelect(row)
  } else if (canPreview(row as FileItem)) {
    await handlePreview(row as FileItem)
  }
}

const handleDownload = async (file: FileItem) => {
  const key = currentPath.value + file.name
  await s3.downloadFile(key, file.name)
}

const handleDownloadFolder = async (folder: {
  name: string
  Prefix: string
}) => {
  if (!folder.Prefix) return
  const zipName = zipArchiveBaseName([folder.Prefix], [])
  zipDownloadLoading.value = true
  try {
    await s3.downloadZip([], [folder.Prefix], currentPath.value, `${zipName}.zip`)
  } finally {
    zipDownloadLoading.value = false
  }
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
      const url = await s3.getPreviewUrl(key)
      if (url) {
        const response = await fetch(url)
        if (response.ok) {
          previewTextContent.value = await response.text()
        } else {
          previewTextContent.value = 'Failed to load file content'
        }
      }
    } catch {
      previewTextContent.value = 'Error loading file content'
    }
  } else {
    previewUrl.value = await s3.getPreviewUrl(key)
  }

  previewLoading.value = false
}

const handleDelete = async (file: FileItem) => {
  if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return
  const key = currentPath.value + file.name
  await s3.deleteFile(key)
}

const handleDeleteFolder = async (folder: { name: string, Prefix: string }) => {
  folderToDelete.value = folder
  isCheckingFolder.value = true
  folderContentsCount.value = 0
  showDeleteFolderConfirm.value = true
  try {
    folderContentsCount.value = await s3.getFolderContentsCount(folder.Prefix)
  } finally {
    isCheckingFolder.value = false
  }
}

const confirmDeleteFolder = async () => {
  if (!folderToDelete.value) return
  isDeletingFolder.value = true
  const success = await s3.deleteFolder(folderToDelete.value.Prefix)
  isDeletingFolder.value = false
  if (success) {
    showDeleteFolderConfirm.value = false
    folderToDelete.value = null
    folderContentsCount.value = 0
  }
}

const handleRenameFolder = (folder: { name: string, Prefix: string }) => {
  folderToRename.value = folder
  showRenameFolder.value = true
}

const confirmRenameFolderWithName = async (newName: string) => {
  if (!folderToRename.value) return
  const parentPath = folderToRename.value.Prefix.replace(/[^/]+\/$/, '')
  const newPrefix = parentPath + newName + '/'
  isRenamingFolder.value = true
  const success = await s3.renameFolder(folderToRename.value.Prefix, newPrefix)
  isRenamingFolder.value = false
  if (success) {
    showRenameFolder.value = false
    folderToRename.value = null
  }
}

const handleRenameFile = (file: FileItem) => {
  fileToRename.value = file
  showRenameFile.value = true
}

const handleMetadata = async (file: FileItem) => {
  if (isPublicMode.value) return
  metadataItem.value = file
  showMetadata.value = true
  metadataEntries.value = []
  metadataLoading.value = true
  try {
    const key = currentPath.value + file.name
    const result = await s3.getObjectMetadata(key)
    if (result?.metadata) {
      metadataEntries.value = Object.entries(result.metadata).map(
        ([key, value]) => ({ key, value: String(value ?? '') })
      )
    }
    if (metadataEntries.value.length === 0) {
      metadataEntries.value = [{ key: '', value: '' }]
    }
  } finally {
    metadataLoading.value = false
  }
}

const saveMetadata = async () => {
  if (!metadataItem.value || metadataSaving.value) return
  const metadata: Record<string, string> = {}
  for (const entry of metadataEntries.value) {
    const k = entry.key.trim()
    if (k) metadata[k] = entry.value
  }
  const key = currentPath.value + metadataItem.value.name
  metadataSaving.value = true
  const success = await s3.updateObjectMetadata(key, metadata)
  metadataSaving.value = false
  if (success) {
    showMetadata.value = false
    metadataItem.value = null
    const identifier = getIdentifier()
    if (identifier && selectedBucketName.value) {
      await s3.fetchFiles(
        identifier,
        selectedBucketName.value,
        currentPath.value
      )
    }
  }
}

const closeMetadata = () => {
  showMetadata.value = false
  metadataItem.value = null
  metadataEntries.value = []
}

const handleRenameBucketClick = (bucketName: string) => {
  bucketToRename.value = bucketName
  showRenameBucket.value = true
}

const confirmRenameBucketWithName = async (newName: string) => {
  if (!bucketToRename.value || !props.selectedDestinationId) return
  const oldName = bucketToRename.value
  if (newName === oldName) {
    showRenameBucket.value = false
    bucketToRename.value = null
    return
  }
  isRenamingBucket.value = true
  const success = await s3.renameBucket(
    props.selectedDestinationId,
    oldName,
    newName
  )
  isRenamingBucket.value = false
  if (success) {
    showRenameBucket.value = false
    bucketToRename.value = null
    if (selectedBucketName.value === oldName) {
      selectedBucketName.value = newName
    }
    const idx = availableBuckets.value.indexOf(oldName)
    if (idx >= 0) {
      availableBuckets.value = [
        ...availableBuckets.value.slice(0, idx),
        newName,
        ...availableBuckets.value.slice(idx + 1)
      ]
    }
  }
}

const confirmRenameFileWithName = async (newName: string) => {
  if (!fileToRename.value) return
  const oldKey = currentPath.value + fileToRename.value.name
  const newKey = currentPath.value + newName
  isRenamingFile.value = true
  const success = await s3.renameFile(oldKey, newKey)
  isRenamingFile.value = false
  if (success) {
    showRenameFile.value = false
    fileToRename.value = null
  }
}

const handleFileSelect = async (files: FileList) => {
  const fileArray = Array.from(files)
  Promise.all(
    fileArray.map(file => s3.uploadFile(file, currentPath.value))
  ).catch((error) => {
    handleError(error, 'Error loading files')
  })
}

const handleDrop = async (files: FileList) => {
  const fileArray = Array.from(files)
  Promise.all(
    fileArray.map(file => s3.uploadFile(file, currentPath.value))
  ).catch((error) => {
    handleError(error, 'Error loading files')
  })
}

const handleCreateFolder = async (name: string) => {
  if (!name?.trim()) return
  isCreatingFolder.value = true
  const success = await s3.createFolder(name.trim())
  isCreatingFolder.value = false
  if (success) {
    showCreateFolder.value = false
  }
}

const handleSaveMetadata = async (
  entries: { key: string, value: string }[]
) => {
  metadataEntries.value = entries
  await saveMetadata()
}
</script>
