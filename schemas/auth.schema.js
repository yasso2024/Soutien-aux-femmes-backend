const { z } = require('zod');

const signUpSchema = z.object({
    email: z.string('Email is required').email({ message: "Invalid email format" }),
    firstName: z.string().min(1, { message: "First Name is required" }).optional(),
    lastName: z.string().min(1, { message: "Last Name is required" }).optional(),
    nomOrganisation: z.string().min(1, { message: "Nom de l'organisation requis" }).optional(),
    password: z.string()
        .min(8, { message: "Password must be greater than 8 chars" })
        .max(32, { message: "Password must be less than 32 chars" }),
    confirmPassword: z.string()
        .min(8, { message: "Password must be greater than 8 chars" })
        .max(32, { message: "Password must be less than 32 chars" }),
    dob: z.string().optional(),
    telephone: z.string()
        .regex(/^\d{8}$/, { message: "Le téléphone doit contenir exactement 8 chiffres" }),
  region: z.string().min(1, { message: "Region is required" }),
  role: z.enum([  "USER","FEMME MALADE","ADMINISTRATEUR", "BENEVOLE", "DONTEUR", "DONATEUR", "ASSOCIATION",
  ]),
  dateDeclaration: z.string().optional(),
  dateDiagnostic: z.string().optional(),
  adresse: z.string().optional(),
  membreDepuis: z.string().optional(),
  competences: z.array(z.string()).optional(),
});

const loginSchema = z.object({
    email: z.string('Email is required').email({ message: "Invalid email format" }),
    password: z.string()
        .min(8, { message: "Password must be greater than 8 chars" })
        .max(32, { message: "Password must be less than 32 chars" }),
})

const changePasswordSchema = z.object({
    currentPassword: z.string()
        .min(8, { message: "Password must be greater than 8 chars" })
        .max(32, { message: "Password must be less than 32 chars" }),

    newPassword: z.string()
        .min(8, { message: "Password must be greater than 8 chars" })
        .max(32, { message: "Password must be less than 32 chars" }),

    confirmNewPassword: z.string()
        .min(8, { message: "Password must be greater than 8 chars" })
        .max(32, { message: "Password must be less than 32 chars" }),
});
module.exports = { signUpSchema, loginSchema,changePasswordSchema };