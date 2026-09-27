import { contactRepository } from '@/repositories'
import type {
  Contact,
  ContactFilter,
  CreateContactInput,
  UpdateContactInput,
} from '@/types'
import { DomainError } from './errors'

function validateContactInput(input: CreateContactInput | UpdateContactInput): void {
  if (!input.name?.trim()) {
    throw new DomainError('contact/invalid', 'Name is required.')
  }
  if (!input.designation?.trim()) {
    throw new DomainError('contact/invalid', 'Designation is required.')
  }
  if (!input.department?.trim()) {
    throw new DomainError('contact/invalid', 'Department is required.')
  }
  if (!input.phone?.trim()) {
    throw new DomainError('contact/invalid', 'Phone is required.')
  }
  const email = input.email?.trim() ?? ''
  if (!email) {
    throw new DomainError('contact/invalid', 'Email is required.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DomainError('contact/invalid', 'Enter a valid email address.')
  }
}

export const contactService = {
  async list(filter?: ContactFilter): Promise<Contact[]> {
    let rows = await contactRepository.list()

    const department = filter?.department?.trim()
    if (department && department !== 'all') {
      rows = rows.filter((c) => c.department === department)
    }

    const q = filter?.query?.trim().toLowerCase()
    if (q) {
      rows = rows.filter((c) => {
        const haystack = [c.name, c.designation, c.department, c.phone, c.email, c.notes ?? '']
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    return rows
  },

  async getById(id: string): Promise<Contact | null> {
    return contactRepository.getById(id)
  },

  async create(input: CreateContactInput): Promise<Contact> {
    validateContactInput(input)
    return contactRepository.create(input)
  },

  async update(id: string, input: UpdateContactInput): Promise<Contact> {
    const existing = await contactRepository.getById(id)
    if (!existing) throw new DomainError('contact/not-found', 'Contact not found.')
    validateContactInput(input)
    return contactRepository.update(id, input)
  },

  async remove(id: string): Promise<void> {
    const existing = await contactRepository.getById(id)
    if (!existing) throw new DomainError('contact/not-found', 'Contact not found.')
    await contactRepository.remove(id)
  },

  async listDepartments(): Promise<string[]> {
    const rows = await contactRepository.list()
    return [...new Set(rows.map((c) => c.department).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    )
  },
}
