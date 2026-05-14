const { z } = require('zod');

const createPropositionAideSchema = z.object({
  titre: z.string().min(1, 'Titre obligatoire').optional(),
  typeAide: z.enum(['Transport', 'Alimentation', 'Soins', 'Soutien psychologique', 'Administratif', 'Financier', 'Autre']).optional(),
  description: z.string().min(1, 'Description obligatoire'),
  demande: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().min(1, 'La demande est obligatoire').optional()
  ),
  femme: z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.string().min(1).optional()
  )
});

const updatePropositionAideSchema = z.object({
  description: z.string().min(1).optional(),
  statut: z.enum(['PROPOSEE', 'ACCEPTEE', 'REFUSEE']).optional()
});

module.exports = { createPropositionAideSchema, updatePropositionAideSchema };