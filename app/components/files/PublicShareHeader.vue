<template>
  <UHeader
    :toggle="false"
    class="border-b border-default bg-default shrink-0"
  >
    <template #title>
      <div class="flex items-center gap-2 min-w-0">
        <img
          :src="logoImg"
          alt="BucketFlow"
          height="32"
          width="32"
          class="shrink-0"
        >
        <div class="min-w-0">
          <span class="font-semibold truncate block">
            BucketFlow
          </span>
          <span class="text-lg text-muted truncate block sm:hidden">
            {{ locationLabel }}
          </span>
        </div>
      </div>
    </template>

    <div class="hidden sm:flex items-center gap-2 min-w-0">
      <UIcon
        name="i-heroicons-solid-cloud"
        class="w-6 h-6 text-muted shrink-0"
      />
      <span class="text-lg text-muted truncate">
        {{ locationLabel }}
      </span>
    </div>

    <template #right>
      <UColorModeButton />
    </template>
  </UHeader>
</template>

<script setup lang="ts">
import logoImg from '~/assets/logo.png'

defineProps<{
  locationLabel: string
}>()
</script>
