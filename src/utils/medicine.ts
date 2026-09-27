/**
 * Builds the canonical medicine display name.
 * Brand names must never be part of identity or displayName.
 */
export function buildMedicineDisplayName(
  genericName: string,
  strength: string,
  dosageForm: string,
  volume = '',
): string {
  return [genericName.trim(), strength.trim(), dosageForm.trim(), volume.trim()]
    .filter(Boolean)
    .join(' ')
}

/** Stable comparison key for uniqueness checks (case-insensitive). */
export function medicineIdentityKey(
  genericName: string,
  strength: string,
  dosageForm: string,
  volume = '',
): string {
  return [genericName, strength, dosageForm, volume]
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, ' '))
    .join('|')
}
