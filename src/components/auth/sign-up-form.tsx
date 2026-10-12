"use client";

import { type SignUpFormValues, signUpSchema } from "@/lib/validators/auth";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconAlertCircle,
  IconMail,
  IconArrowRight,
  IconLock,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { signUpAction } from "@/actions/auth";
import { requestToJoinAction } from "@/actions/join";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import PasswordRules from "./password-rules";

type SignUpFormProps = {
  token?: string;
};

function SignUpForm({ token }: SignUpFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpFormValues) {
    setServerError(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    formData.append("email", values.email);
    formData.append("password", values.password);

    const result = await signUpAction(formData);
    if (result.error) {
      setServerError(result.error);
      setIsLoading(false);
      return;
    }

    if (token) {
      // The account exists now, so a failed request (say the link was reset
      // meanwhile) still leaves them signed in; onboarding picks up from there.
      const joinResult = await requestToJoinAction(token);
      if (joinResult.error) {
        setServerError(joinResult.error);
        setIsLoading(false);
        return;
      }
      router.push("/onboarding/pending");
      return;
    }

    router.push("/onboarding/company");
  }

  const pwd = useWatch({ control: form.control, name: "password" }) ?? "";

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col space-y-4"
    >
      <section className="flex flex-col gap-4">
        <div className="flex flex-row items-start justify-between gap-3">
          <Controller
            name="first_name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel>First Name</FieldLabel>
                <Input
                  {...field}
                  placeholder="John"
                  autoComplete="off"
                  inputMode="text"
                />
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
            name="last_name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel>Last Name</FieldLabel>
                <Input
                  {...field}
                  placeholder="Doe"
                  autoComplete="off"
                  inputMode="text"
                />
                {fieldState.error && (
                  <FieldError className="flex flex-row gap-1 items-center text-xs">
                    <IconAlertCircle size={14} />
                    {fieldState.error.message}
                  </FieldError>
                )}
              </Field>
            )}
          />
        </div>
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
        className="mt-auto w-full rounded-full text-base py-6 flex flex-row items-center"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          "Creating account..."
        ) : (
          <>
            Continue
            <IconArrowRight stroke={2} />
          </>
        )}
      </Button>
    </form>
  );
}

export default SignUpForm;
