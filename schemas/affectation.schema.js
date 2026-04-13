const { z } = require('zod');

const createAffectationSchema = z.object({
  benevole: z.string().min(1, 'Bénévole obligatoire'),
  action: z.string().min(1, 'Action obligatoire'),
  demande: z.string().optional()
});

const updateAffectationSchema = z.object({
  statut: z.enum(['EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'TERMINEE']).optional(),
  demande: z.string().optional()
});

module.exports = { createAffectationSchema, updateAffectationSchema };
