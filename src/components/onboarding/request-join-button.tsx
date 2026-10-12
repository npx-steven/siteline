"use client";

import { requestToJoinAction } from "@/actions/join";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

function RequestJoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleRequest() {
    setError(null);
    setIsLoading(true);
    const result = await requestToJoinAction(token);
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    router.push("/onboarding/pending");
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        size="lg"
        onClick={handleRequest}
        disabled={isLoading}
        className="w-full rounded-full text-base py-6"
      >
        {isLoading ? "Sending request..." : "Request to Join"}
      </Button>
    </div>
  );
}

export default RequestJoinButton;
