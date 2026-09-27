import { locationRepository } from '@/repositories'
import type { CreateLocationInput, HospitalLocation } from '@/types'
import { DomainError } from './errors'

export const locationService = {
  async list(activeOnly = true): Promise<HospitalLocation[]> {
    return locationRepository.list(activeOnly)
  },

  async getById(id: string): Promise<HospitalLocation | null> {
    return locationRepository.getById(id)
  },

  async requireById(id: string): Promise<HospitalLocation> {
    const location = await locationRepository.getById(id)
    if (!location || !location.isActive) {
      throw new DomainError('location/not-found', 'Hospital location not found.')
    }
    return location
  },

  async create(input: CreateLocationInput): Promise<HospitalLocation> {
    if (!input.name?.trim() || !input.code?.trim()) {
      throw new DomainError('location/invalid', 'Location name and code are required.')
    }
    return locationRepository.create({
      ...input,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      isActive: input.isActive ?? true,
    })
  },
}
