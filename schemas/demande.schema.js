const { z } = require('zod');

const createDemandeSchema = z.object({
  titre: z.string().min(1, 'Le titre est obligatoire'),
  description: z.string().min(1, 'La description est obligatoire'),
  type: z.enum(['FINANCIERE', 'MATERIELLE', 'ACCOMPAGNEMENT', 'LOGEMENT'])
});

const updateDemandeSchema = z.object({
  titre: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  type: z.enum(['FINANCIERE', 'MATERIELLE', 'ACCOMPAGNEMENT', 'LOGEMENT']).optional(),
  statut: z.enum(['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'EN_COURS', 'TERMINEE']).optional(),
  don: z.string().optional().nullable()
});

module.exports = { createDemandeSchema, updateDemandeSchema };