<template>
  <UContainer>
    <div class="space-y-6">
      <UPageHeader title="Admin Panel" description="Manage S3 configuration and users" :links="[]" />

      <UTabs :items="tabs" class="w-full flex gap-6">
        <template #s3>
          <AdminS3Config />
        </template>

        <template #users>
          <AdminUsers />
        </template>
      </UTabs>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const tabs = [
  { key: 's3', label: 'S3 Configuration', icon: 'i-heroicons-cloud', slot: 's3' },
  { key: 'users', label: 'Users', icon: 'i-heroicons-users', slot: 'users' },
]

</script>
