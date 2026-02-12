import type { User, S3Destination } from '../../app/types'

const USERS_KEY = 'app:users'
const DESTINATIONS_KEY = 'app:destinations'
const SECRETS_KEY = 'app:secrets'

export interface AppSecrets {
  jwtSecret: string
}

export async function getSecrets(): Promise<AppSecrets | null> {
  const storage = useStorage('data')
  return await storage.getItem<AppSecrets>(SECRETS_KEY)
}

export async function saveSecrets(secrets: AppSecrets): Promise<void> {
  const storage = useStorage('data')
  await storage.setItem(SECRETS_KEY, secrets)
}

export async function getUsers(): Promise<User[]> {
  const storage = useStorage('data')
  const users = await storage.getItem<User[]>(USERS_KEY)
  return users || []
}

export async function saveUsers(users: User[]): Promise<void> {
  const storage = useStorage('data')
  await storage.setItem(USERS_KEY, users)
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers()
  return users.find(u => u.username === username) || null
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers()
  return users.find(u => u.id === id) || null
}

export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
  const users = await getUsers()
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  users.push(newUser)
  await saveUsers(users)
  return newUser
}

export async function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
  const users = await getUsers()
  const index = users.findIndex(u => u.id === id)
  if (index === -1) return null

  users[index] = {
    ...users[index],
    ...updates,
    updatedAt: new Date().toISOString()
  } as User
  await saveUsers(users)
  return users[index]
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getUsers()
  const filtered = users.filter(u => u.id !== id)
  if (filtered.length === users.length) return false
  await saveUsers(filtered)
  return true
}

export async function getDestinations(): Promise<S3Destination[]> {
  const storage = useStorage('data')
  const destinations = await storage.getItem<S3Destination[]>(DESTINATIONS_KEY)
  return destinations || []
}

export async function saveDestinations(destinations: S3Destination[]): Promise<void> {
  const storage = useStorage('data')
  await storage.setItem(DESTINATIONS_KEY, destinations)
}

export async function getDestinationById(id: string): Promise<S3Destination | null> {
  const destinations = await getDestinations()
  return destinations.find(d => d.id === id) || null
}

export async function getDestinationBySlug(slug: string): Promise<S3Destination | null> {
  const destinations = await getDestinations()
  return destinations.find(d => d.slug === slug) || null
}

export async function createDestination(destination: Omit<S3Destination, 'id' | 'createdAt' | 'updatedAt'>): Promise<S3Destination> {
  const destinations = await getDestinations()

  // Check if slug already exists
  if (destinations.some(d => d.slug === destination.slug)) {
    throw new Error('Destination with this slug already exists')
  }

  const newDestination: S3Destination = {
    ...destination,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  destinations.push(newDestination)
  await saveDestinations(destinations)
  return newDestination
}

export async function updateDestination(id: string, updates: Partial<Omit<S3Destination, 'id' | 'createdAt'>>): Promise<S3Destination | null> {
  const destinations = await getDestinations()
  const index = destinations.findIndex(d => d.id === id)
  if (index === -1) return null

  // Check if slug is being changed and if it conflicts with another destination
  if (updates.slug && destinations.some((d, i) => d.slug === updates.slug && i !== index)) {
    throw new Error('Destination with this slug already exists')
  }

  destinations[index] = {
    ...destinations[index],
    ...updates,
    updatedAt: new Date().toISOString()
  } as S3Destination
  await saveDestinations(destinations)
  return destinations[index]
}

export async function deleteDestination(id: string): Promise<boolean> {
  const destinations = await getDestinations()
  const filtered = destinations.filter(d => d.id !== id)
  if (filtered.length === destinations.length) return false
  await saveDestinations(filtered)
  return true
}
