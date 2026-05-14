const { z } = require('zod');

const SERVICES = [
  'SOUTIEN_PSYCHOLOGIQUE',
  'AIDE_ADMINISTRATIVE',
  'FORMATION_INFORMATIQUE',
  'COUTURE',
  'ENSEIGNEMENT',
  'ACCOMPAGNEMENT_MEDICAL',
  'ACTIVITES_ENFANTS',
  'AUTRE',
];

const upsertProfilBenevoleSchema = z.object({
  bio: z.string().max(1000).optional(),
  competences: z.array(z.string().trim().min(1)).optional(),
  services: z.array(z.enum(SERVICES)).optional(),
  disponibilite: z.string().max(500).optional(),
  experience: z.string().max(2000).optional(),
  langues: z.array(z.string().trim().min(1)).optional(),
});

module.exports = { upsertProfilBenevoleSchema };
