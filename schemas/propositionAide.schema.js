const { z } = require('zod');

const createPropositionAideSchema = z.object({
  description: z.string().min(1, 'Description obligatoire'),
  demande: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().min(1, 'La demande est obligatoire').optional()
  )
});

const updatePropositionAideSchema = z.object({
  description: z.string().min(1).optional(),
  statut: z.enum(['PROPOSEE', 'ACCEPTEE', 'REFUSEE']).optional()
});

module.exports = { createPropositionAideSchema, updatePropositionAideSchema };