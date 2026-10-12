"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { IconAlertCircle, IconMail, IconMailCheck } from "@tabler/icons-react";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { requestPasswordResetAction } from "@/actions/auth";
import {
  type ForgotPasswordFormValues,
  forgotPasswordSchema,
} from "@/lib/validators/auth";

function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null);
    setIsLoading(true);
    const formData = new FormData();
    formData.append("email", values.email);

    const result = await requestPasswordResetAction(formData);
    setIsLoading(false);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-start gap-3 rounded-xl border border-border bg-card p-4">
          <IconMailCheck stroke={1.5} className="size-5 shrink-0" />
          <p className="text-sm text-pretty">
            If an account exists for{" "}
            <span className="font-semibold">{sentTo}</span>, a reset link is on
            its way. It can only be used once.
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-pretty">
          Nothing after a few minutes? Check your spam folder, or send it again.
        </p>
        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full rounded-full text-base"
          disabled={isLoading}
          onClick={() => onSubmit({ email: sentTo })}
        >
          {isLoading ? "Sending..." : "Send Again"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button
        type="submit"
        className="w-full rounded-full text-base py-6 mt-6"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}

export default ForgotPasswordForm;
