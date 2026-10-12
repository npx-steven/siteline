"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconAlertCircle, IconLock } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { updatePasswordAction } from "@/actions/auth";
import {
  type ResetPasswordFormValues,
  resetPasswordSchema,
} from "@/lib/validators/auth";
import PasswordRules from "./password-rules";

function ResetPasswordForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm_password: "" },
  });

  const pwd = useWatch({ control: form.control, name: "password" }) ?? "";

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null);
    setIsLoading(true);
    const formData = new FormData();
    formData.append("password", values.password);
    formData.append("confirm_password", values.confirm_password);

    const result = await updatePasswordAction(formData);
    if (result.error) {
      setServerError(result.error);
      setIsLoading(false);
      return;
    }

    toast.success("Password updated");
    // The proxy sends anyone without a company on to onboarding from here.
    router.replace("/projects");
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col space-y-4"
    >
      <section className="flex flex-col gap-4">
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="password">New Password</FieldLabel>
              <InputGroup className="gap-1 items-center align-middle">
                <InputGroupAddon>
                  <IconLock className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
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
          name="confirm_password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="confirm_password">
                Confirm Password
              </FieldLabel>
              <InputGroup className="gap-1 items-center align-middle">
                <InputGroupAddon>
                  <IconLock className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
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
        <PasswordRules password={pwd} />
      </section>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button
        type="submit"
        className="mt-auto w-full rounded-full text-base py-6"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}

export default ResetPasswordForm;
