import { z } from "zod"

// Password minimum length enforced client-side.
// Complexity (lowercase + uppercase + digit) is NOT replicated here — the
// policy lives in Supabase Dashboard → Auth → Password Requirements and is
// enforced server-side on signUp / updateUser. The server returns
// `weak_password`, which is mapped to Spanish copy via getAuthErrorMessage.
// Duplicating the regex would cause drift when the Dashboard policy changes.
const MIN_PASSWORD_LENGTH = 8

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu email")
    .email("Ingresa un email válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
})
export type SignInValues = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre (al menos 2 caracteres)"),
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu email")
    .email("Ingresa un email válido"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`),
})
export type SignUpValues = z.infer<typeof signUpSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu email")
    .email("Ingresa un email válido"),
})
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

// Hint copy shown below password inputs in sign-up and reset-password forms.
// Reflects the Supabase Dashboard password policy. If the policy changes,
// update this string — there is no client-side regex to keep in sync.
export const PASSWORD_HINT =
  "Mínimo 8 caracteres. Incluye mayúsculas, minúsculas y números."
