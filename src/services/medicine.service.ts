import { medicineRepository } from '@/repositories'
import type { CreateMedicineInput, Medicine, MedicineFilter } from '@/types'
import { buildMedicineDisplayName, medicineIdentityKey } from '@/utils'
import { DomainError } from './errors'

function assertMedicineFields(input: CreateMedicineInput): void {
  if (!input.genericName?.trim()) {
    throw new DomainError('medicine/invalid', 'Generic name is required.')
  }
  if (!input.strength?.trim()) {
    throw new DomainError('medicine/invalid', 'Strength is required.')
  }
  if (!input.dosageForm?.trim()) {
    throw new DomainError('medicine/invalid', 'Dosage form is required.')
  }
}

/**
 * Medicine domain service. catalog search and identity rules.
 * Brand names are intentionally excluded from identity.
 */
export const medicineService = {
  buildDisplayName: buildMedicineDisplayName,
  identityKey: medicineIdentityKey,

  async list(filter?: MedicineFilter): Promise<Medicine[]> {
    return medicineRepository.list(filter)
  },

  async getById(id: string): Promise<Medicine | null> {
    return medicineRepository.getById(id)
  },

  async search(query: string): Promise<Medicine[]> {
    return medicineRepository.search(query)
  },

  async listActive(): Promise<Medicine[]> {
    return medicineRepository.list({ isActive: true })
  },

  /**
   * Validates uniqueness of generic+strength+form+volume before persistence.
   * Persistence create remains repository-backed (Firestore when implemented).
   */
  async create(input: CreateMedicineInput): Promise<Medicine> {
    assertMedicineFields(input)
    const volume = input.volume?.trim() ?? ''
    const existing = await medicineRepository.findByIdentity(
      input.genericName,
      input.strength,
      input.dosageForm,
      volume,
    )
    if (existing) {
      throw new DomainError(
        'medicine/duplicate',
        `A medicine variant already exists: ${existing.displayName}`,
      )
    }

    return medicineRepository.create({
      ...input,
      volume,
      displayName:
        input.displayName?.trim() ||
        buildMedicineDisplayName(input.genericName, input.strength, input.dosageForm, volume),
      isActive: input.isActive ?? true,
    })
  },
}
