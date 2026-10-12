import { z } from "zod";

const capitalize = (s: string) =>
  s.trim().charAt(0).toUpperCase() + s.trim().slice(1).toLowerCase();

// Shared by sign-up and password reset. The checklist in
// components/auth/password-rules.tsx mirrors these rules.
const passwordSchema = z
  .string()
  .min(8, "Password doesn't meet all requirements")
  .regex(/[A-Z]/, "Must include 1 uppercase letter")
  .regex(/[0-9]/, "Must include 1 number")
  .regex(/[^\w\s]/, "Must include 1 symbol");

// Sign Up Schema and Sign Up form values type
export const signUpSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Enter your first name.")
    .transform(capitalize),
  last_name: z
    .string()
    .trim()
    .min(1, "Enter your last name.")
    .transform(capitalize),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: passwordSchema,
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;

// Sign In schema and sign in form values type
export const signInSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords don't match",
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
