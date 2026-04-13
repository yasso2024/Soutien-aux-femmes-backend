const { z } = require('zod');

const createDonSchema = z.object({
  montant: z.number().nonnegative().optional(),
  type: z.enum(['FINANCIER', 'MATERIEL']),
  demande: z.string().optional()
});

const updateDonSchema = z.object({
  montant: z.number().nonnegative().optional(),
  type: z.enum(['FINANCIER', 'MATERIEL']).optional(),
  statut: z.enum(['EN_ATTENTE', 'CONFIRME', 'REFUSE']).optional(),
  demande: z.string().optional().nullable()
});

module.exports = { createDonSchema, updateDonSchema };