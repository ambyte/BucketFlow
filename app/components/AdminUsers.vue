<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-users" class="w-5 h-5" />
          <h3 class="text-lg font-semibold">User Management</h3>
        </div>
        <UButton color="primary" icon="i-heroicons-user-plus" @click="showCreateUser = true">
          Add User
        </UButton>
      </div>
    </template>

    <div>
      <p v-if="editorUsers.length === 0" class="text-lg text-center text-gray-500 dark:text-gray-400">
        Create your first user to get started.
      </p>

      <div v-else class="grid gap-4">
        <UCard v-for="user in editorUsers" :key="user.id" class="relative">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="text-lg font-semibold mb-1">{{ user.username }}</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Created at: {{ formatDate(user.createdAt as string) }}
              </p>
            </div>
            <div class="flex gap-2 mt-2">
              <UButton variant="ghost" icon="i-heroicons-pencil" size="lg" @click="editUser(user)" />
              <UButton variant="ghost" icon="i-heroicons-trash" size="lg" color="error" @click="confirmDelete(user)" />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Create User Modal -->
    <UModal v-model:open="showCreateUser" title="Create New User" description="Add a new editor user to the system">
      <template #body>
        <UForm :state="userForm" @submit="handleCreateUser" class="space-y-4">
          <UFormField label="Username" required>
            <UInput v-model="userForm.username" placeholder="Enter username" class="w-full" autocomplete="off" />
          </UFormField>

          <UFormField label="Password" required>
            <UInput v-model="userForm.password" type="password" placeholder="Enter password" class="w-full"
              autocomplete="new-password" />
          </UFormField>

          <UFormField label="Confirm Password" required>
            <UInput v-model="userForm.passwordConfirm" type="password" placeholder="Repeat password" class="w-full"
              autocomplete="new-password" />
          </UFormField>
        </UForm>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="close">Cancel</UButton>
          <UButton color="primary" :loading="isCreatingUser" :disabled="!isCreateFormValid" @click="handleCreateUser">
            Create User
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit User Modal -->
    <UModal v-model:open="showEditUser" title="Edit User" description="Change user password">
      <template #body>
        <UForm :state="editForm" @submit="handleUpdateUser" class="space-y-4">
          <UFormField label="Username" name="username">
            <UInput v-model="editForm.username" placeholder="Username" class="w-full" disabled />
          </UFormField>

          <UFormField label="New Password" name="password">
            <UInput v-model="editForm.password" type="password" placeholder="Leave empty to keep current" class="w-full"
              autocomplete="new-password" />
          </UFormField>

          <UFormField label="Confirm Password" name="passwordConfirm">
            <UInput v-model="editForm.passwordConfirm" type="password" placeholder="Repeat new password" class="w-full"
              autocomplete="new-password" />
          </UFormField>

        </UForm>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="close">Cancel</UButton>
          <UButton color="primary" :loading="isUpdatingUser" :disabled="!isEditFormValid" @click="handleUpdateUser">
            Save
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { User } from '../types'

const { apiCall } = useAuth()

const users = ref<User[]>([])
const showCreateUser = ref(false)
const showEditUser = ref(false)
const isCreatingUser = ref(false)
const isUpdatingUser = ref(false)
const userForm = reactive({
  username: '',
  password: '',
  passwordConfirm: ''
})
const editForm = reactive({
  userId: null as string | null,
  username: '',
  password: '',
  passwordConfirm: ''
})

const editorUsers = computed(() => users.value.filter(u => u.role === 'editor'))

const isCreateFormValid = computed(() => {
  return userForm.username.length >= 3 &&
    userForm.password.length >= 6 &&
    userForm.password === userForm.passwordConfirm
})

const isEditFormValid = computed(() => {
  const hasPassword = editForm.password.length > 0
  const hasConfirm = editForm.passwordConfirm.length > 0
  if (hasPassword || hasConfirm) {
    return editForm.password.length >= 6 && editForm.password === editForm.passwordConfirm
  }
  return true
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const fetchUsers = async () => {
  try {
    const response = await apiCall('/api/admin/users')
    users.value = response.users
  }
  catch (error: any) {
    console.error('Failed to fetch users:', error)
    useToast().add({
      title: 'Error',
      description: error?.data?.statusMessage || 'Failed to load users',
      color: 'error'
    })
  }
}

const handleCreateUser = async () => {
  if (userForm.password !== userForm.passwordConfirm) {
    useToast().add({
      title: 'Error',
      description: 'Passwords do not match',
      color: 'error'
    })
    return
  }

  isCreatingUser.value = true

  try {
    await apiCall('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        username: userForm.username,
        password: userForm.password,
        role: 'editor'
      })
    })

    useToast().add({
      title: 'Success',
      description: 'User created successfully',
      color: 'success'
    })

    showCreateUser.value = false
    userForm.username = ''
    userForm.password = ''
    userForm.passwordConfirm = ''

    await fetchUsers()
  }
  catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error?.data?.statusMessage || 'Failed to create user',
      color: 'error'
    })
  }

  isCreatingUser.value = false
}

const openEditModal = (user: User) => {
  editForm.userId = user.id as string
  editForm.username = user.username
  editForm.password = ''
  editForm.passwordConfirm = ''
  showEditUser.value = true
}

const handleUpdateUser = async () => {
  if (editForm.password && editForm.password !== editForm.passwordConfirm) {
    useToast().add({
      title: 'Error',
      description: 'Passwords do not match',
      color: 'error'
    })
    return
  }

  if (!editForm.userId) return

  isUpdatingUser.value = true

  try {
    const body: { password?: string } = {}
    if (editForm.password) {
      body.password = editForm.password
    }

    await apiCall(`/api/admin/users/${editForm.userId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })

    useToast().add({
      title: 'Success',
      description: 'User updated successfully',
      color: 'success'
    })

    showEditUser.value = false
    editForm.userId = null
    editForm.username = ''
    editForm.password = ''
    editForm.passwordConfirm = ''

    await fetchUsers()
  }
  catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error?.data?.statusMessage || 'Failed to update user',
      color: 'error'
    })
  }

  isUpdatingUser.value = false
}

const editUser = (user: User) => {
  openEditModal(user)
}

const confirmDelete = async (user: User) => {
  const confirmed = confirm(`Are you sure you want to delete "${user.username}"?`)
  if (!confirmed) return

  try {
    await apiCall(`/api/admin/users/${user.id}`, {
      method: 'DELETE'
    })

    useToast().add({
      title: 'Success',
      description: 'User deleted',
      color: 'success'
    })

    await fetchUsers()
  }
  catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error?.data?.statusMessage || 'Failed to delete user',
      color: 'error'
    })
  }
}

onMounted(async () => {
  await fetchUsers()
})
</script>
