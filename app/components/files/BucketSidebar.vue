<template>
  <aside
    v-if="show"
    class="w-64 flex flex-col overflow-hidden min-h-max"
  >
    <div class="flex-1 overflow-y-auto border-r border-default">
      <div class="p-4">
        <h2 class="font-semibold text-sm">
          Buckets
        </h2>
      </div>
      <div class="px-2 pb-2">
        <div
          v-if="loading"
          class="p-2 text-sm text-muted"
        >
          Loading...
        </div>
        <div
          v-else-if="buckets.length === 0"
          class="p-2 text-sm text-muted"
        >
          No buckets
        </div>
        <div
          v-else
          class="space-y-1"
        >
          <div
            v-for="bucket in buckets"
            :key="bucket"
            class="group flex items-center gap-1 w-full rounded-md transition-colors"
            :class="{ 'bg-accented': selectedBucket === bucket }"
          >
            <button
              class="flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors hover:bg-elevated min-w-0"
              @click="$emit('select', bucket)"
            >
              <UIcon
                name="i-heroicons-folder"
                class="w-4 h-4 text-primary shrink-0"
              />
              <span class="truncate text-default">{{ bucket }}</span>
              <UTooltip
                v-if="canRename"
                text="Rename bucket"
                class="ml-auto shrink-0"
              >
                <UButton
                  variant="ghost"
                  color="neutral"
                  icon="i-heroicons-pencil-square"
                  size="xs"
                  class="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  @click.stop="$emit('rename', bucket)"
                />
              </UTooltip>
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  buckets: string[]
  selectedBucket?: string
  loading: boolean
  canRename: boolean
}>()

defineEmits<{
  select: [bucket: string]
  rename: [bucket: string]
}>()
</script>
