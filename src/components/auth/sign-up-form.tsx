"use client";

import { type SignUpFormValues, signUpSchema } from "@/lib/validators/auth";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconAlertCircle,
  IconMail,
  IconArrowRight,
  IconLock,
  IconCircleCheckFilled,
  IconCircle,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { signUpAction } from "@/actions/auth";
import { joinCompanyAction } from "@/actions/invite";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { cn } from "@/lib/utils";

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
      const joinResult = await joinCompanyAction(token);
      if (joinResult.error) {
        setServerError(joinResult.error);
        setIsLoading(false);
        return;
      }
      router.push("/onboarding/welcome");
      return;
    }

    router.push("/onboarding/company");
  }

  const pwd = form.watch("password") ?? "";

  const rules = [
    { label: "At least 8 characters", met: pwd.length >= 8 },
    { label: "At least 1 uppercase letter (A–Z)", met: /[A-Z]/.test(pwd) },
    { label: "At least 1 number (0–9)", met: /[0-9]/.test(pwd) },
    { label: "At least 1 special character (!@#$…)", met: /[^\w\s]/.test(pwd) },
  ];

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
        {pwd.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <ul className="space-y-2 text-xs">
              {rules.map((r) => (
                <li
                  key={r.label}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    r.met ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {r.met ? (
                    <IconCircleCheckFilled
                      size={18}
                      className="text-foreground"
                    />
                  ) : (
                    <IconCircle
                      size={18}
                      className="text-muted-foreground/40"
                    />
                  )}
                  {r.label}
                </li>
              ))}
            </ul>
          </div>
        )}
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
