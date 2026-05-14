


const {z} = require('zod');

const createUserSchema = z.object({
    email: z.string('Email is required').email({ message: "Invalid email format" }),
    firstName: z.string().min(1, { message: "First Name is required" }).optional(),
    lastName: z.string().min(1, { message: "Last Name is required" }).optional(),
    nomOrganisation: z.string().min(1).optional(),
    telephone: z.string().regex(/^\d{8}$/, { message: "Le téléphone doit contenir exactement 8 chiffres" }).optional(),
    password: z.string()
        .min(8, { message: "Password must be greater than 8 chars" })
        .max(32, { message: "Password must be less than 32 chars" }),
    confirmPassword: z.string()
        .min(8, { message: "Password must be greater than 8 chars" })
        .max(32, { message: "Password must be less than 32 chars" }),
    dob: z.string().optional(),
role:z.enum( ["USER", "VISITEUR","FEMME MALADE", "ADMINISTRATEUR","BENEVOLE","DONTEUR","DONATEUR","ASSOCIATION"]).optional(),
    avatar: z.string().optional().nullable()
});

const updateUserSchema = z.object({
    email: z.string('Email is required').email({ message: "Invalid email format" }).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    nomOrganisation: z.string().optional(),
    adresse: z.string().optional(),
    telephone: z.string().regex(/^\d{8}$/, { message: "Le téléphone doit contenir exactement 8 chiffres" }).optional(),
    dob: z.string().optional(),
    dateDiagnostic: z.string().optional(),
    dateDeclaration: z.string().optional(),
   role:z.enum( ["USER", "VISITEUR","FEMME MALADE", "ADMINISTRATEUR","BENEVOLE","DONTEUR","DONATEUR","ASSOCIATION"]).optional(),
    avatar: z.string().optional().nullable(),
    competences: z.array(z.string()).optional(),
});

module.exports = {createUserSchema, updateUserSchema};

