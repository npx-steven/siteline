"use client";

import {
  type CreateCompanyFormValues,
  createCompanySchema,
} from "@/lib/validators/company";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { createCompanyAction } from "@/actions/company";
import {
  IconBuilding,
  IconAlertCircle,
  IconShieldCheck,
} from "@tabler/icons-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";

function CreateCompanyForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { company_name: "" },
  });

  async function onSubmit(values: CreateCompanyFormValues) {
    setServerError(null);
    setIsLoading(true);
    const formData = new FormData();
    formData.append("company_name", values.company_name);

    const result = await createCompanyAction(formData);
    if (result.error) {
      setServerError(result.error);
      setIsLoading(false);
      return;
    }

    router.push("/onboarding/welcome");
  }
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col space-y-4"
    >
      <section className="flex flex-col gap-4">
        <Controller
          name="company_name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel>Company Name</FieldLabel>
              <InputGroup className="gap-1 items-center align-middle">
                <InputGroupAddon>
                  <IconBuilding className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  {...field}
                  id="company_name"
                  placeholder="Acme Construction"
                  autoComplete="organization"
                  inputMode="text"
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
        <div className="flex flex-row items-start border border-border gap-2 rounded-xl bg-card p-4">
          <IconShieldCheck stroke={2} size={16} />
          <div className="flex flex-col gap-1 items-start">
            <h2 className="text-xs font-semibold ">You&apos;ll be the owner</h2>
            <p className="text-xs font-normal text-muted-foreground">
              You can invite your crew with a link once you&apos;re in.
            </p>
          </div>
        </div>
      </section>

      {/* Server error */}
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button
        type="submit"
        className="mt-auto w-full rounded-full text-base py-6 flex flex-row items-center"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? "Creating company..." : "Create Company"}
      </Button>
    </form>
  );
}

export default CreateCompanyForm;
