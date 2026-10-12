import CreateCompanyForm from "@/components/onboarding/create-company-form";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";

function OnboardingCompanyPage() {
  return (
    <div className="flex flex-col h-dvh px-6 ">
      <div className="py-4" aria-hidden>
        <div className="size-9" />
      </div>
      <div>
        <OnboardingProgress step={2} total={2} />
      </div>
      <div className="flex flex-col items-start my-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Name Your Company
        </h1>
        <p className="text-sm font-normal text-muted-foreground tracking-tight ">
          Your projects and crew live under this.
        </p>
      </div>
      <div className="flex flex-1 flex-col w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
        <CreateCompanyForm />
      </div>
    </div>
  );
}

export default OnboardingCompanyPage;
