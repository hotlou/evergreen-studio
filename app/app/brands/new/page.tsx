import { IntakeWizard } from "@/components/intake/IntakeWizard";

export const metadata = { title: "New brand · Evergreen Studio" };

export default function NewBrandPage() {
  return (
    <div className="px-8 py-10">
      <div className="max-w-2xl mx-auto mb-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-muted mb-1.5">
          INTAKE · NEW BRAND
        </div>
        <h1 className="font-display text-[32px] font-semibold tracking-tight text-evergreen-700 leading-tight">
          Describe your brand.
        </h1>
        <p className="text-sm text-slate-muted mt-1.5">
          Five minutes now saves a thousand generic generations later.
        </p>
      </div>

      <IntakeWizard />
    </div>
  );
}
