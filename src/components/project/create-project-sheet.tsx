import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import CreateProjectForm from "./create-project-form";

function CreateProjectSheet({
  open,
  onOpenChange,
  onProjectCreated,
  onDiscardPhoto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (projectId: string) => void;
  // Set when the sheet is open for a just-captured photo. The sheet then
  // can't be swiped away, so the photo is only ever dropped on purpose.
  onDiscardPhoto?: () => void;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="bottom"
      repositionInputs={false}
      dismissible={!onDiscardPhoto}
    >
      <DrawerContent
        className="rounded-t-3xl bg-background "
        aria-describedby={undefined}
        autoFocus={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DrawerHeader className="flex-1  align-middle items-center">
          <DrawerTitle className="text-sm font-medium text-foreground ">
            Enter Project Details
          </DrawerTitle>
        </DrawerHeader>
        <CreateProjectForm
          isOpen={open}
          onComplete={(result) => {
            if (!result.error) {
              onOpenChange(false);
              if (result.projectId) {
                onProjectCreated?.(result.projectId);
              }
            }
          }}
        />
        {onDiscardPhoto && (
          <div className="-mt-10 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Button
              variant="ghost"
              onClick={onDiscardPhoto}
              className="w-full rounded-full text-muted-foreground"
            >
              Discard Photo
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

export default CreateProjectSheet;
