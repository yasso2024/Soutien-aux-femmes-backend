const { z } = require('zod');
const propositionAideSchema = z.object({
    demandeAideId: z.string().min(1, 'Demande requise'),
    description:   z.string().min(10, 'Description trop courte (min 10 car.)'),
    montantPropose: z.number().positive().optional(),
});
module.exports = { propositionAideSchema };
