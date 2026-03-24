<template>
  <header
    class="border-b border-default px-4 py-2 flex items-center justify-between bg-default"
  >
    <!-- Breadcrumb Navigation -->
    <div class="flex items-center gap-2 text-sm">
      <button
        v-if="selectedBucketName"
        class="font-medium text-highlighted hover:text-primary transition-colors cursor-pointer"
        @click="$emit('breadcrumb-click', -1)"
      >
        {{ selectedBucketName }}
      </button>
      <template v-if="pathParts.length > 0">
        <span
          v-for="(part, index) in pathParts"
          :key="index"
          class="flex items-center gap-2"
        >
          <span class="text-muted">></span>
          <button
            class="font-medium text-highlighted hover:text-primary transition-colors cursor-pointer"
            @click="$emit('breadcrumb-click', index)"
          >
            {{ part }}
          </button>
        </span>
      </template>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-2 flex-wrap justify-end">
      <div
        v-if="hasIdentifier && selectedBucketName"
        class="px-2 py-2 flex items-center gap-2 bg-default"
      >
        <UButton
          v-if="selectedCount > 0 || zipDownloadLoading"
          variant="outline"
          color="primary"
          size="sm"
          icon="i-heroicons-arrow-down-tray"
          :loading="zipDownloadLoading"
          :disabled="zipDownloadLoading"
          @click="$emit('download-selected')"
        >
          {{ zipDownloadLoading ? 'Preparing…' : 'Download' }}
        </UButton>
        <UButton
          v-if="canUpload"
          variant="outline"
          color="primary"
          size="sm"
          @click="$emit('upload-click')"
        >
          Upload
        </UButton>
        <UButton
          v-if="canCreateFolder"
          variant="outline"
          color="primary"
          size="sm"
          @click="$emit('create-folder-click')"
        >
          New Folder
        </UButton>
        <UButton
          v-if="canCreatePublicLink"
          variant="outline"
          color="primary"
          size="sm"
          icon="i-heroicons-link"
          @click="$emit('public-link-click')"
        >
          Public Link
        </UButton>
      </div>
      <UButton
        variant="ghost"
        color="neutral"
        :icon="
          viewMode === 'grid' ? 'i-heroicons-squares-2x2' : 'i-heroicons-bars-3'
        "
        size="sm"
        @click="$emit('toggle-view')"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  selectedBucketName?: string
  path: string
  hasIdentifier: boolean
  canUpload: boolean
  canCreateFolder: boolean
  canCreatePublicLink: boolean
  viewMode: 'grid' | 'list'
  selectedCount?: number
  zipDownloadLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedCount: 0,
  zipDownloadLoading: false
})

defineEmits<{
  'breadcrumb-click': [index: number]
  'upload-click': []
  'create-folder-click': []
  'public-link-click': []
  'toggle-view': []
  'download-selected': []
}>()

const pathParts = computed(() => {
  return props.path.split('/').filter(Boolean)
})
</script>
