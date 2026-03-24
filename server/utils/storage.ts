import { randomBytes } from 'node:crypto'
import type { User, S3Destination, PublicLink } from '../../app/types'

const USERS_KEY = 'app:users'
const DESTINATIONS_KEY = 'app:destinations'
const PUBLIC_LINKS_KEY = 'app:publicLinks'
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

export async function getUserByUsername(
  username: string
): Promise<User | null> {
  const users = await getUsers()
  return users.find(u => u.username === username) || null
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers()
  return users.find(u => u.id === id) || null
}

export async function createUser(
  user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
): Promise<User> {
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

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | null> {
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

export async function saveDestinations(
  destinations: S3Destination[]
): Promise<void> {
  const storage = useStorage('data')
  await storage.setItem(DESTINATIONS_KEY, destinations)
}

export async function getDestinationById(
  id: string
): Promise<S3Destination | null> {
  const destinations = await getDestinations()
  return destinations.find(d => d.id === id) || null
}

export async function createDestination(
  destination: Omit<S3Destination, 'id' | 'createdAt' | 'updatedAt'>
): Promise<S3Destination> {
  const destinations = await getDestinations()

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

export async function updateDestination(
  id: string,
  updates: Partial<Omit<S3Destination, 'id' | 'createdAt'>>
): Promise<S3Destination | null> {
  const destinations = await getDestinations()
  const index = destinations.findIndex(d => d.id === id)
  if (index === -1) return null

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
  // Also remove public links for this destination
  const links = await getPublicLinks()
  const remainingLinks = links.filter(l => l.destinationId !== id)
  if (remainingLinks.length !== links.length) {
    await savePublicLinks(remainingLinks)
  }
  return true
}

function generateLinkHash(): string {
  return randomBytes(8).toString('hex')
}

export async function getPublicLinks(): Promise<PublicLink[]> {
  const storage = useStorage('data')
  const links = (await storage.getItem<PublicLink[]>(PUBLIC_LINKS_KEY)) || []
  const existingHashes = new Set(links.map(l => l.hash).filter(Boolean))
  let needsSave = false
  for (const link of links) {
    if (!link.hash) {
      let hash = generateLinkHash()
      while (existingHashes.has(hash)) {
        hash = generateLinkHash()
      }
      (link as PublicLink).hash = hash
      existingHashes.add(hash)
      needsSave = true
    }
  }
  if (needsSave) {
    await savePublicLinks(links)
  }
  return links
}

export async function savePublicLinks(links: PublicLink[]): Promise<void> {
  const storage = useStorage('data')
  await storage.setItem(PUBLIC_LINKS_KEY, links)
}

export async function getPublicLinksByDestination(
  destinationId: string
): Promise<PublicLink[]> {
  const links = await getPublicLinks()
  return links.filter(l => l.destinationId === destinationId)
}

export async function generateUniquePublicLinkHash(): Promise<string> {
  const links = await getPublicLinks()
  let hash = generateLinkHash()
  while (links.some(l => l.hash === hash)) {
    hash = generateLinkHash()
  }
  return hash
}

export async function createPublicLink(
  link: Omit<PublicLink, 'id' | 'hash' | 'createdAt'> & { hash?: string }
): Promise<PublicLink> {
  const links = await getPublicLinks()
  let hash = link.hash || generateLinkHash()
  if (link.hash) {
    const alreadyExists = links.some(l => l.hash === link.hash)
    if (alreadyExists) {
      throw new Error('Public link hash already exists')
    }
  } else {
    while (links.some(l => l.hash === hash)) {
      hash = generateLinkHash()
    }
  }
  const newLink: PublicLink = {
    ...link,
    id: crypto.randomUUID(),
    hash,
    createdAt: new Date().toISOString(),
    createdBy: link.createdBy ?? undefined,
    expiresAt: link.expiresAt ?? undefined
  }
  links.push(newLink)
  await savePublicLinks(links)
  return newLink
}

export async function updatePublicLink(
  id: string,
  updates: Partial<Pick<PublicLink, 'allowFileUpload' | 'allowFolderCreation' | 'expiresAt'>>
): Promise<PublicLink> {
  const links = await getPublicLinks()
  const link = links.find(l => l.id === id)
  if (!link) {
    throw new Error('Public link not found')
  }
  if (updates.allowFileUpload !== undefined) link.allowFileUpload = updates.allowFileUpload
  if (updates.allowFolderCreation !== undefined) link.allowFolderCreation = updates.allowFolderCreation
  if (updates.expiresAt !== undefined) link.expiresAt = updates.expiresAt
  await savePublicLinks(links)
  return link
}

export async function deletePublicLink(id: string): Promise<boolean> {
  const links = await getPublicLinks()
  const filtered = links.filter(l => l.id !== id)
  if (filtered.length === links.length) return false
  await savePublicLinks(filtered)
  return true
}

export async function getPublicLinkById(
  id: string
): Promise<PublicLink | null> {
  const links = await getPublicLinks()
  return links.find(l => l.id === id) || null
}

export async function getPublicLinkByHash(
  hash: string
): Promise<PublicLink | null> {
  const links = await getPublicLinks()
  return links.find(l => l.hash === hash) || null
}
