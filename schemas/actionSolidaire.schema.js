const { z } = require('zod');

const createActionSolidaireSchema = z.object({
  titre: z.string().min(1, 'Titre obligatoire'),
  description: z.string().min(1, 'Description obligatoire'),
  dateAction: z.string().min(1, 'Date obligatoire')
});

const updateActionSolidaireSchema = z.object({
  titre: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  dateAction: z.string().optional()
});

module.exports = { createActionSolidaireSchema, updateActionSolidaireSchema };