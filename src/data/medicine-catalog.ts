/**
 * Initial medicine catalog seed for HealthPlus Medicine Inventory.
 *
 * Orientation: generics commonly stocked in Pakistani hospital / dispensary practice.
 * This is a working starter set. not exhaustive and not an official formulary.
 *
 * Identity rule (never brand names):
 *   genericName + strength + dosageForm + volume
 *
 * Distinct pack sizes / strengths / forms are separate selectable variants.
 * Extend by appending entries via `entry(...)` below.
 */

import type { MedicineCategory } from '@/types'
import { buildMedicineDisplayName } from '@/utils/medicine'

export const MEDICINE_CATEGORIES: readonly MedicineCategory[] = [
  'Analgesic',
  'Antibiotic',
  'Antacid',
  'Antihistamine',
  'Antidiabetic',
  'Antihypertensive',
  'Respiratory',
  'Gastrointestinal',
  'Anthelmintic',
  'Dermatological',
  'Vitamins',
  'Emergency',
  'Other',
] as const

export type { MedicineCategory }

export interface MedicineCatalogEntry {
  id: string
  genericName: string
  strength: string
  dosageForm: string
  volume: string
  displayName: string
  isActive: boolean
  category: MedicineCategory
}

function entry(
  id: string,
  genericName: string,
  strength: string,
  dosageForm: string,
  volume: string,
  category: MedicineCategory,
  isActive = true,
): MedicineCatalogEntry {
  return {
    id,
    genericName,
    strength,
    dosageForm,
    volume,
    displayName: buildMedicineDisplayName(genericName, strength, dosageForm, volume),
    isActive,
    category,
  }
}

/**
 * Curated seed list. Add new variants as separate `entry(...)` rows -
 * do not mutate identity fields of existing ids once used in inventory.
 */
export const MEDICINE_CATALOG: readonly MedicineCatalogEntry[] = [
  // -- Analgesic / antipyretic --
  entry('med-paracetamol-500mg-tab', 'Paracetamol', '500mg', 'Tablet', '', 'Analgesic'),
  entry('med-paracetamol-120mg5ml-syr-60ml', 'Paracetamol', '120mg/5ml', 'Syrup', '60ml', 'Analgesic'),
  entry('med-paracetamol-120mg5ml-syr-100ml', 'Paracetamol', '120mg/5ml', 'Syrup', '100ml', 'Analgesic'),
  entry('med-paracetamol-250mg5ml-susp-60ml', 'Paracetamol', '250mg/5ml', 'Suspension', '60ml', 'Analgesic'),
  entry('med-paracetamol-1g-100ml-inf', 'Paracetamol', '1g/100ml', 'Infusion', '100ml', 'Analgesic'),
  entry('med-ibuprofen-200mg-tab', 'Ibuprofen', '200mg', 'Tablet', '', 'Analgesic'),
  entry('med-ibuprofen-400mg-tab', 'Ibuprofen', '400mg', 'Tablet', '', 'Analgesic'),
  entry('med-ibuprofen-100mg5ml-susp-30ml', 'Ibuprofen', '100mg/5ml', 'Suspension', '30ml', 'Analgesic'),
  entry('med-ibuprofen-100mg5ml-susp-60ml', 'Ibuprofen', '100mg/5ml', 'Suspension', '60ml', 'Analgesic'),
  entry('med-diclofenac-50mg-tab', 'Diclofenac Sodium', '50mg', 'Tablet', '', 'Analgesic'),
  entry('med-diclofenac-75mg3ml-inj', 'Diclofenac Sodium', '75mg/3ml', 'Injection', '3ml', 'Analgesic'),
  entry('med-aspirin-75mg-tab', 'Aspirin', '75mg', 'Tablet', '', 'Analgesic'),
  entry('med-aspirin-300mg-tab', 'Aspirin', '300mg', 'Tablet', '', 'Analgesic'),
  entry('med-tramadol-50mg-cap', 'Tramadol', '50mg', 'Capsule', '', 'Analgesic'),
  entry('med-tramadol-100mg2ml-inj', 'Tramadol', '100mg/2ml', 'Injection', '2ml', 'Analgesic'),
  entry('med-mefenamic-250mg-cap', 'Mefenamic Acid', '250mg', 'Capsule', '', 'Analgesic'),
  entry('med-mefenamic-50mg5ml-susp-60ml', 'Mefenamic Acid', '50mg/5ml', 'Suspension', '60ml', 'Analgesic'),

  // -- Antibiotic --
  entry('med-amoxicillin-250mg-cap', 'Amoxicillin', '250mg', 'Capsule', '', 'Antibiotic'),
  entry('med-amoxicillin-500mg-cap', 'Amoxicillin', '500mg', 'Capsule', '', 'Antibiotic'),
  entry('med-amoxicillin-125mg5ml-susp-60ml', 'Amoxicillin', '125mg/5ml', 'Suspension', '60ml', 'Antibiotic'),
  entry('med-amoxicillin-250mg5ml-susp-60ml', 'Amoxicillin', '250mg/5ml', 'Suspension', '60ml', 'Antibiotic'),
  entry('med-amoxicillin-clav-625mg-tab', 'Amoxicillin + Clavulanic Acid', '625mg', 'Tablet', '', 'Antibiotic'),
  entry('med-amoxicillin-clav-1g-tab', 'Amoxicillin + Clavulanic Acid', '1g', 'Tablet', '', 'Antibiotic'),
  entry(
    'med-amoxicillin-clav-156mg5ml-susp-70ml',
    'Amoxicillin + Clavulanic Acid',
    '156.25mg/5ml',
    'Suspension',
    '70ml',
    'Antibiotic',
  ),
  entry(
    'med-amoxicillin-clav-312mg5ml-susp-70ml',
    'Amoxicillin + Clavulanic Acid',
    '312.5mg/5ml',
    'Suspension',
    '70ml',
    'Antibiotic',
  ),
  entry('med-cefixxime-200mg-cap', 'Cefixime', '200mg', 'Capsule', '', 'Antibiotic'),
  entry('med-cefixxime-400mg-cap', 'Cefixime', '400mg', 'Capsule', '', 'Antibiotic'),
  entry('med-cefixxime-100mg5ml-susp-30ml', 'Cefixime', '100mg/5ml', 'Suspension', '30ml', 'Antibiotic'),
  entry('med-cefixxime-100mg5ml-susp-60ml', 'Cefixime', '100mg/5ml', 'Suspension', '60ml', 'Antibiotic'),
  entry('med-ceftriaxone-500mg-inj', 'Ceftriaxone', '500mg', 'Injection', '', 'Antibiotic'),
  entry('med-ceftriaxone-1g-inj', 'Ceftriaxone', '1g', 'Injection', '', 'Antibiotic'),
  entry('med-ceftazidime-1g-inj', 'Ceftazidime', '1g', 'Injection', '', 'Antibiotic'),
  entry('med-cefotaxime-1g-inj', 'Cefotaxime', '1g', 'Injection', '', 'Antibiotic'),
  entry('med-ciprofloxacin-500mg-tab', 'Ciprofloxacin', '500mg', 'Tablet', '', 'Antibiotic'),
  entry('med-ciprofloxacin-200mg100ml-inf', 'Ciprofloxacin', '200mg/100ml', 'Infusion', '100ml', 'Antibiotic'),
  entry('med-levofloxacin-500mg-tab', 'Levofloxacin', '500mg', 'Tablet', '', 'Antibiotic'),
  entry('med-metronidazole-400mg-tab', 'Metronidazole', '400mg', 'Tablet', '', 'Antibiotic'),
  entry('med-metronidazole-200mg5ml-susp-60ml', 'Metronidazole', '200mg/5ml', 'Suspension', '60ml', 'Antibiotic'),
  entry('med-metronidazole-500mg100ml-inf', 'Metronidazole', '500mg/100ml', 'Infusion', '100ml', 'Antibiotic'),
  entry('med-azithromycin-250mg-tab', 'Azithromycin', '250mg', 'Tablet', '', 'Antibiotic'),
  entry('med-azithromycin-500mg-tab', 'Azithromycin', '500mg', 'Tablet', '', 'Antibiotic'),
  entry('med-azithromycin-200mg5ml-susp-15ml', 'Azithromycin', '200mg/5ml', 'Suspension', '15ml', 'Antibiotic'),
  entry('med-clarithromycin-500mg-tab', 'Clarithromycin', '500mg', 'Tablet', '', 'Antibiotic'),
  entry('med-doxycycline-100mg-cap', 'Doxycycline', '100mg', 'Capsule', '', 'Antibiotic'),
  entry('med-vancomycin-500mg-inj', 'Vancomycin', '500mg', 'Injection', '', 'Antibiotic'),
  entry('med-vancomycin-1g-inj', 'Vancomycin', '1g', 'Injection', '', 'Antibiotic'),
  entry('med-meropenem-500mg-inj', 'Meropenem', '500mg', 'Injection', '', 'Antibiotic'),
  entry('med-meropenem-1g-inj', 'Meropenem', '1g', 'Injection', '', 'Antibiotic'),
  entry('med-piperacillin-tazo-4-5g-inj', 'Piperacillin + Tazobactam', '4.5g', 'Injection', '', 'Antibiotic'),
  entry('med-gentamicin-80mg2ml-inj', 'Gentamicin', '80mg/2ml', 'Injection', '2ml', 'Antibiotic'),
  entry('med-amikacin-500mg2ml-inj', 'Amikacin', '500mg/2ml', 'Injection', '2ml', 'Antibiotic'),
  entry(
    'med-cotrimoxazole-480mg-tab',
    'Sulfamethoxazole + Trimethoprim',
    '480mg',
    'Tablet',
    '',
    'Antibiotic',
  ),
  entry(
    'med-cotrimoxazole-240mg5ml-susp-50ml',
    'Sulfamethoxazole + Trimethoprim',
    '240mg/5ml',
    'Suspension',
    '50ml',
    'Antibiotic',
  ),
  entry('med-linezolid-600mg-tab', 'Linezolid', '600mg', 'Tablet', '', 'Antibiotic'),
  entry('med-nitrofurantoin-100mg-cap', 'Nitrofurantoin', '100mg', 'Capsule', '', 'Antibiotic'),

  // -- Antacid / acid suppression --
  entry('med-omeprazole-20mg-cap', 'Omeprazole', '20mg', 'Capsule', '', 'Antacid'),
  entry('med-omeprazole-40mg-inj', 'Omeprazole', '40mg', 'Injection', '', 'Antacid'),
  entry('med-pantoprazole-40mg-tab', 'Pantoprazole', '40mg', 'Tablet', '', 'Antacid'),
  entry('med-pantoprazole-40mg-inj', 'Pantoprazole', '40mg', 'Injection', '', 'Antacid'),
  entry('med-famotidine-20mg-tab', 'Famotidine', '20mg', 'Tablet', '', 'Antacid'),
  entry('med-famotidine-40mg-tab', 'Famotidine', '40mg', 'Tablet', '', 'Antacid'),
  entry('med-antacid-susp-120ml', 'Aluminium Hydroxide + Magnesium Hydroxide', '', 'Suspension', '120ml', 'Antacid'),
  entry('med-sucralfate-1g-tab', 'Sucralfate', '1g', 'Tablet', '', 'Antacid'),

  // -- Antihistamine --
  entry('med-cetirizine-10mg-tab', 'Cetirizine', '10mg', 'Tablet', '', 'Antihistamine'),
  entry('med-cetirizine-5mg5ml-syr-60ml', 'Cetirizine', '5mg/5ml', 'Syrup', '60ml', 'Antihistamine'),
  entry('med-loratadine-10mg-tab', 'Loratadine', '10mg', 'Tablet', '', 'Antihistamine'),
  entry('med-chlorpheniramine-4mg-tab', 'Chlorpheniramine Maleate', '4mg', 'Tablet', '', 'Antihistamine'),
  entry(
    'med-chlorpheniramine-2mg5ml-syr-60ml',
    'Chlorpheniramine Maleate',
    '2mg/5ml',
    'Syrup',
    '60ml',
    'Antihistamine',
  ),
  entry('med-promethazine-25mg-tab', 'Promethazine', '25mg', 'Tablet', '', 'Antihistamine'),
  entry('med-promethazine-25mg1ml-inj', 'Promethazine', '25mg/1ml', 'Injection', '1ml', 'Antihistamine'),

  // -- Antidiabetic --
  entry('med-metformin-500mg-tab', 'Metformin', '500mg', 'Tablet', '', 'Antidiabetic'),
  entry('med-metformin-850mg-tab', 'Metformin', '850mg', 'Tablet', '', 'Antidiabetic'),
  entry('med-glimepiride-1mg-tab', 'Glimepiride', '1mg', 'Tablet', '', 'Antidiabetic'),
  entry('med-glimepiride-2mg-tab', 'Glimepiride', '2mg', 'Tablet', '', 'Antidiabetic'),
  entry('med-gliclazide-80mg-tab', 'Gliclazide', '80mg', 'Tablet', '', 'Antidiabetic'),
  entry(
    'med-insulin-regular-100iu-ml-vial-10ml',
    'Insulin Regular (Human)',
    '100 IU/ml',
    'Vial',
    '10ml',
    'Antidiabetic',
  ),
  entry(
    'med-insulin-nph-100iu-ml-vial-10ml',
    'Insulin NPH (Human)',
    '100 IU/ml',
    'Vial',
    '10ml',
    'Antidiabetic',
  ),
  entry(
    'med-insulin-70-30-100iu-ml-vial-10ml',
    'Insulin Biphasic 70/30 (Human)',
    '100 IU/ml',
    'Vial',
    '10ml',
    'Antidiabetic',
  ),

  // -- Antihypertensive / CV --
  entry('med-amlodipine-5mg-tab', 'Amlodipine', '5mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-amlodipine-10mg-tab', 'Amlodipine', '10mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-atenolol-50mg-tab', 'Atenolol', '50mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-atenolol-100mg-tab', 'Atenolol', '100mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-losartan-50mg-tab', 'Losartan', '50mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-losartan-100mg-tab', 'Losartan', '100mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-enalapril-5mg-tab', 'Enalapril', '5mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-enalapril-10mg-tab', 'Enalapril', '10mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-captopril-25mg-tab', 'Captopril', '25mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-furosemide-40mg-tab', 'Furosemide', '40mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-furosemide-20mg2ml-inj', 'Furosemide', '20mg/2ml', 'Injection', '2ml', 'Antihypertensive'),
  entry('med-spironolactone-25mg-tab', 'Spironolactone', '25mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-spironolactone-100mg-tab', 'Spironolactone', '100mg', 'Tablet', '', 'Antihypertensive'),
  entry('med-atorvastatin-10mg-tab', 'Atorvastatin', '10mg', 'Tablet', '', 'Other'),
  entry('med-atorvastatin-20mg-tab', 'Atorvastatin', '20mg', 'Tablet', '', 'Other'),
  entry('med-clopidogrel-75mg-tab', 'Clopidogrel', '75mg', 'Tablet', '', 'Other'),
  entry('med-isosorbide-mn-20mg-tab', 'Isosorbide Mononitrate', '20mg', 'Tablet', '', 'Other'),
  entry('med-digoxin-0-25mg-tab', 'Digoxin', '0.25mg', 'Tablet', '', 'Other'),

  // -- Respiratory --
  entry('med-salbutamol-2mg5ml-syr-100ml', 'Salbutamol', '2mg/5ml', 'Syrup', '100ml', 'Respiratory'),
  entry('med-salbutamol-100mcg-inh', 'Salbutamol', '100mcg/puff', 'Inhaler', '', 'Respiratory'),
  entry('med-salbutamol-5mg-neb', 'Salbutamol', '5mg', 'Nebulizer Solution', '', 'Respiratory'),
  entry('med-ipratropium-250mcg-neb', 'Ipratropium Bromide', '250mcg', 'Nebulizer Solution', '', 'Respiratory'),
  entry('med-budesonide-0-5mg-neb', 'Budesonide', '0.5mg', 'Nebulizer Solution', '', 'Respiratory'),
  entry('med-budesonide-1mg-neb', 'Budesonide', '1mg', 'Nebulizer Solution', '', 'Respiratory'),
  entry('med-aminophylline-250mg10ml-inj', 'Aminophylline', '250mg/10ml', 'Injection', '10ml', 'Respiratory'),
  entry('med-montelukast-5mg-tab', 'Montelukast', '5mg', 'Tablet', '', 'Respiratory'),
  entry('med-montelukast-10mg-tab', 'Montelukast', '10mg', 'Tablet', '', 'Respiratory'),
  entry('med-acetylcysteine-600mg-sachet', 'Acetylcysteine', '600mg', 'Sachet', '', 'Respiratory'),

  // -- Gastrointestinal --
  entry('med-ondansetron-4mg-tab', 'Ondansetron', '4mg', 'Tablet', '', 'Gastrointestinal'),
  entry('med-ondansetron-8mg4ml-inj', 'Ondansetron', '8mg/4ml', 'Injection', '4ml', 'Gastrointestinal'),
  entry('med-metoclopramide-10mg-tab', 'Metoclopramide', '10mg', 'Tablet', '', 'Gastrointestinal'),
  entry('med-metoclopramide-10mg2ml-inj', 'Metoclopramide', '10mg/2ml', 'Injection', '2ml', 'Gastrointestinal'),
  entry('med-domperidone-10mg-tab', 'Domperidone', '10mg', 'Tablet', '', 'Gastrointestinal'),
  entry('med-ors-20-5g-sachet', 'Oral Rehydration Salts', '20.5g', 'Sachet', '', 'Gastrointestinal'),
  entry('med-lactulose-3-35g5ml-syr-120ml', 'Lactulose', '3.35g/5ml', 'Syrup', '120ml', 'Gastrointestinal'),
  entry('med-lactulose-3-35g5ml-syr-200ml', 'Lactulose', '3.35g/5ml', 'Syrup', '200ml', 'Gastrointestinal'),
  entry('med-hyoscine-butylbromide-10mg-tab', 'Hyoscine Butylbromide', '10mg', 'Tablet', '', 'Gastrointestinal'),
  entry(
    'med-hyoscine-butylbromide-20mg1ml-inj',
    'Hyoscine Butylbromide',
    '20mg/1ml',
    'Injection',
    '1ml',
    'Gastrointestinal',
  ),
  entry('med-loperamide-2mg-cap', 'Loperamide', '2mg', 'Capsule', '', 'Gastrointestinal'),

  // -- Anthelmintic --
  entry('med-albendazole-400mg-tab', 'Albendazole', '400mg', 'Tablet', '', 'Anthelmintic'),
  entry('med-albendazole-200mg5ml-susp-10ml', 'Albendazole', '200mg/5ml', 'Suspension', '10ml', 'Anthelmintic'),
  entry('med-mebendazole-100mg-tab', 'Mebendazole', '100mg', 'Tablet', '', 'Anthelmintic'),
  entry('med-mebendazole-100mg5ml-susp-30ml', 'Mebendazole', '100mg/5ml', 'Suspension', '30ml', 'Anthelmintic'),

  // -- Dermatological --
  entry('med-clotrimazole-1-cream-20g', 'Clotrimazole', '1%', 'Cream', '20g', 'Dermatological'),
  entry('med-miconazole-2-cream-15g', 'Miconazole', '2%', 'Cream', '15g', 'Dermatological'),
  entry('med-hydrocortisone-1-cream-15g', 'Hydrocortisone', '1%', 'Cream', '15g', 'Dermatological'),
  entry('med-betamethasone-0-1-cream-15g', 'Betamethasone Valerate', '0.1%', 'Cream', '15g', 'Dermatological'),
  entry('med-fusidic-acid-2-cream-15g', 'Fusidic Acid', '2%', 'Cream', '15g', 'Dermatological'),
  entry('med-silver-sulfadiazine-1-cream-50g', 'Silver Sulfadiazine', '1%', 'Cream', '50g', 'Dermatological'),
  entry('med-povidone-iodine-10-sol-100ml', 'Povidone Iodine', '10%', 'Solution', '100ml', 'Dermatological'),
  entry('med-povidone-iodine-10-sol-450ml', 'Povidone Iodine', '10%', 'Solution', '450ml', 'Dermatological'),
  entry('med-chlorhexidine-4-sol-500ml', 'Chlorhexidine Gluconate', '4%', 'Solution', '500ml', 'Dermatological'),

  // -- Vitamins / hematinics --
  entry('med-folic-acid-5mg-tab', 'Folic Acid', '5mg', 'Tablet', '', 'Vitamins'),
  entry('med-iron-folate-tab', 'Ferrous Fumarate + Folic Acid', '150mg + 0.5mg', 'Tablet', '', 'Vitamins'),
  entry('med-ferrous-sulfate-200mg-tab', 'Ferrous Sulfate', '200mg', 'Tablet', '', 'Vitamins'),
  entry('med-vitamin-b-complex-tab', 'Vitamin B Complex', '', 'Tablet', '', 'Vitamins'),
  entry('med-vitamin-c-500mg-tab', 'Ascorbic Acid', '500mg', 'Tablet', '', 'Vitamins'),
  entry('med-vitamin-d3-200000iu-inj', 'Cholecalciferol', '200000 IU', 'Injection', '', 'Vitamins'),
  entry('med-vitamin-k1-10mg1ml-inj', 'Phytomenadione (Vitamin K1)', '10mg/1ml', 'Injection', '1ml', 'Vitamins'),
  entry('med-thiamine-100mg-inj', 'Thiamine', '100mg', 'Injection', '', 'Vitamins'),
  entry('med-calcium-carbonate-500mg-tab', 'Calcium Carbonate', '500mg', 'Tablet', '', 'Vitamins'),

  // -- Emergency / critical care --
  entry('med-adrenaline-1mg1ml-inj', 'Adrenaline', '1mg/1ml', 'Injection', '1ml', 'Emergency'),
  entry('med-atropine-1mg1ml-inj', 'Atropine Sulfate', '1mg/1ml', 'Injection', '1ml', 'Emergency'),
  entry('med-noradrenaline-4mg4ml-inj', 'Noradrenaline', '4mg/4ml', 'Injection', '4ml', 'Emergency'),
  entry('med-dopamine-200mg5ml-inj', 'Dopamine', '200mg/5ml', 'Injection', '5ml', 'Emergency'),
  entry('med-hydrocortisone-100mg-inj', 'Hydrocortisone', '100mg', 'Injection', '', 'Emergency'),
  entry('med-dexamethasone-4mg1ml-inj', 'Dexamethasone', '4mg/1ml', 'Injection', '1ml', 'Emergency'),
  entry('med-methylprednisolone-500mg-inj', 'Methylprednisolone', '500mg', 'Injection', '', 'Emergency'),
  entry('med-diazepam-10mg2ml-inj', 'Diazepam', '10mg/2ml', 'Injection', '2ml', 'Emergency'),
  entry('med-midazolam-5mg5ml-inj', 'Midazolam', '5mg/5ml', 'Injection', '5ml', 'Emergency'),
  entry('med-naloxone-0-4mg1ml-inj', 'Naloxone', '0.4mg/1ml', 'Injection', '1ml', 'Emergency'),
  entry('med-tranexamic-500mg5ml-inj', 'Tranexamic Acid', '500mg/5ml', 'Injection', '5ml', 'Emergency'),
  entry('med-heparin-5000iu-ml-inj-5ml', 'Heparin Sodium', '5000 IU/ml', 'Injection', '5ml', 'Emergency'),
  entry('med-protamine-50mg5ml-inj', 'Protamine Sulfate', '50mg/5ml', 'Injection', '5ml', 'Emergency'),
  entry('med-lignocaine-2-inj-30ml', 'Lignocaine', '2%', 'Injection', '30ml', 'Emergency'),
  entry('med-oxycytocin-10iu1ml-inj', 'Oxytocin', '10 IU/1ml', 'Injection', '1ml', 'Emergency'),
  entry('med-magnesium-sulfate-50-2ml-inj', 'Magnesium Sulfate', '50%', 'Injection', '2ml', 'Emergency'),
  entry('med-calcium-gluconate-10-10ml-inj', 'Calcium Gluconate', '10%', 'Injection', '10ml', 'Emergency'),
  entry('med-potassium-chloride-1g10ml-inj', 'Potassium Chloride', '1g/10ml', 'Injection', '10ml', 'Emergency'),
  entry('med-dextrose-25-25ml-inj', 'Dextrose', '25%', 'Injection', '25ml', 'Emergency'),
  entry('med-sodium-bicarbonate-8-4-50ml-inj', 'Sodium Bicarbonate', '8.4%', 'Injection', '50ml', 'Emergency'),

  // -- Other (fluids, steroids oral, CNS, antimalarial, etc.) --
  entry('med-ns-0-9-500ml-inf', 'Sodium Chloride', '0.9%', 'Infusion', '500ml', 'Other'),
  entry('med-ns-0-9-1000ml-inf', 'Sodium Chloride', '0.9%', 'Infusion', '1000ml', 'Other'),
  entry('med-ns-0-9-100ml-inf', 'Sodium Chloride', '0.9%', 'Infusion', '100ml', 'Other'),
  entry('med-dns-500ml-inf', 'Dextrose + Sodium Chloride', '5% + 0.9%', 'Infusion', '500ml', 'Other'),
  entry('med-dextrose-5-500ml-inf', 'Dextrose', '5%', 'Infusion', '500ml', 'Other'),
  entry('med-dextrose-10-500ml-inf', 'Dextrose', '10%', 'Infusion', '500ml', 'Other'),
  entry('med-rl-500ml-inf', 'Ringer Lactate', '', 'Infusion', '500ml', 'Other'),
  entry('med-rl-1000ml-inf', 'Ringer Lactate', '', 'Infusion', '1000ml', 'Other'),
  entry('med-prednisolone-5mg-tab', 'Prednisolone', '5mg', 'Tablet', '', 'Other'),
  entry('med-prednisolone-15mg5ml-syr-60ml', 'Prednisolone', '15mg/5ml', 'Syrup', '60ml', 'Other'),
  entry('med-diazepam-5mg-tab', 'Diazepam', '5mg', 'Tablet', '', 'Other'),
  entry('med-phenytoin-100mg-cap', 'Phenytoin', '100mg', 'Capsule', '', 'Other'),
  entry('med-valproate-200mg-tab', 'Sodium Valproate', '200mg', 'Tablet', '', 'Other'),
  entry('med-valproate-500mg-tab', 'Sodium Valproate', '500mg', 'Tablet', '', 'Other'),
  entry('med-haloperidol-5mg1ml-inj', 'Haloperidol', '5mg/1ml', 'Injection', '1ml', 'Other'),
  entry('med-artemether-lum-20-120-tab', 'Artemether + Lumefantrine', '20mg/120mg', 'Tablet', '', 'Other'),
  entry('med-chloroquine-250mg-tab', 'Chloroquine Phosphate', '250mg', 'Tablet', '', 'Other'),
  entry('med-paracetamol-codeine-tab', 'Paracetamol + Codeine', '500mg + 30mg', 'Tablet', '', 'Analgesic'),
] as const

export function findCatalogEntry(id: string): MedicineCatalogEntry | undefined {
  return MEDICINE_CATALOG.find((item) => item.id === id)
}

/** Multi-token catalog search (generic, strength, form, volume, display, category). */
export function searchMedicineCatalog(
  query: string,
  options?: { activeOnly?: boolean; limit?: number },
): MedicineCatalogEntry[] {
  const activeOnly = options?.activeOnly ?? true
  const limit = options?.limit ?? 80
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  let rows = MEDICINE_CATALOG.filter((item) => (activeOnly ? item.isActive : true))

  if (tokens.length) {
    rows = rows.filter((item) => {
      const haystack = [
        item.displayName,
        item.genericName,
        item.strength,
        item.dosageForm,
        item.volume,
        item.category,
      ]
        .join(' ')
        .toLowerCase()
      return tokens.every((token) => haystack.includes(token))
    })
  }

  return rows
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .slice(0, limit)
}

export function listCatalogByCategory(category: MedicineCategory): MedicineCatalogEntry[] {
  return MEDICINE_CATALOG.filter((item) => item.category === category && item.isActive)
}
