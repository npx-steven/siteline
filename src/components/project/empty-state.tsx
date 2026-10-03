import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type EmptyStateProps = {
  icon: React.ElementType;
  title: string;
  subtext: string;
};

function EmptyState({ icon, title, subtext }: EmptyStateProps) {
  const Icon = icon;
  return (
    <Empty className="h-full ">
      <EmptyHeader className="gap-0.5">
        <EmptyMedia className="bg-white p-4 rounded-xl border border-border">
          <Icon size={32} stroke={1.5} className="text-brand-tertiary" />
        </EmptyMedia>
        <EmptyTitle className="text-lg font-semibold text-foreground">
          {title}
        </EmptyTitle>
        <EmptyDescription className="text-muted-foreground leading-snug text-pretty">
          {subtext}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default EmptyState;
