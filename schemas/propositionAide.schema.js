const { z } = require('zod');

const createPropositionAideSchema = z.object({
  description: z.string().min(1, 'Description obligatoire'),
  demande: z.string().min(1, 'Demande obligatoire')
});

const updatePropositionAideSchema = z.object({
  description: z.string().min(1).optional(),
  statut: z.enum(['PROPOSEE', 'ACCEPTEE', 'REFUSEE']).optional()
});

module.exports = { createPropositionAideSchema, updatePropositionAideSchema };