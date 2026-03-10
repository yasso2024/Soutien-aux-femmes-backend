const { z } = require('zod');
const donSchema = z.object({
    montant:     z.number({ required_error: 'Montant requis' }).positive('Doit être positif'),
    type:        z.enum(['FINANCIER', 'MATERIEL']).default('FINANCIER'),
    demandeAideId: z.string().optional(),
    description: z.string().optional(),
});
module.exports = { donSchema };
