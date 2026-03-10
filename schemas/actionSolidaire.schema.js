const { z } = require('zod');
const actionSolidaireSchema = z.object({
    titre:       z.string().min(3, 'Titre trop court'),
    description: z.string().min(10, 'Description trop courte'),
    dateAction:  z.string().min(1, 'Date requise'),
    lieu:        z.string().optional(),
    typeAction:  z.enum(['COLLECTE', 'SENSIBILISATION', 'ACCOMPAGNEMENT', 'FORMATION', 'AUTRE']).default('AUTRE'),
    nombrePlaces: z.number().int().positive().optional(),
});
module.exports = { actionSolidaireSchema };
