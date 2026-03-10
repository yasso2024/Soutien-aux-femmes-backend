const { z } = require('zod');
const demandeAideSchema = z.object({
    titre:       z.string().min(5, 'Titre trop court (min 5 car.)'),
    description: z.string().min(20, 'Description trop courte (min 20 car.)'),
    type:        z.enum(['FINANCIERE', 'MATERIELLE', 'ACCOMPAGNEMENT', 'LOGEMENT']),
    urgence:     z.enum(['FAIBLE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).default('MOYENNE'),
    region:      z.string().optional(),
    montantDemande: z.number().positive().optional(),
    dateEcheance:   z.string().optional(),
});
module.exports = { demandeAideSchema };
