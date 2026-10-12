"use client";

import { Controller, useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { signInAction } from "@/actions/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignInFormValues, signInSchema } from "@/lib/validators/auth";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { IconMail, IconLock, IconAlertCircle } from "@tabler/icons-react";

// Only join links may be resumed after sign-in, so ?next= can't be used to
// send someone to an arbitrary (or external) URL.
function safeNext(next: string | undefined): string {
  return next && /^\/join\/[\w-]+$/.test(next) ? next : "/projects";
}

function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInFormValues) {
    setServerError(null);
    setIsLoading(true);
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);

    const result = await signInAction(formData);
    if (result.error) {
      setServerError(result.error);
      setIsLoading(false);
      return;
    }
    router.push(safeNext(next));
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      method="post"
      className="space-y-4"
    >
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <InputGroup className="gap-1 items-center align-middle">
              <InputGroupAddon>
                <IconMail className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                {...field}
                id="email"
                placeholder="you@company.com"
                autoComplete="email"
                inputMode="email"
              />
            </InputGroup>
            {fieldState.error && (
              <FieldError className="flex flex-row gap-1 items-center text-xs">
                <IconAlertCircle size={14} />
                {fieldState.error.message}
              </FieldError>
            )}
          </Field>
        )}
      />

      <Controller
        name="password"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel>Password</FieldLabel>
            <InputGroup className="gap-1 items-center align-middle">
              <InputGroupAddon>
                <IconLock className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                {...field}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </InputGroup>
            {fieldState.error && (
              <FieldError className="flex flex-row gap-1 items-center text-xs">
                <IconAlertCircle size={14} />
                {fieldState.error.message}
              </FieldError>
            )}
          </Field>
        )}
      />

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button
        type="submit"
        className="w-full rounded-full text-base py-6 mt-6"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

export default SignInForm;
