import { ShieldCheck, ShieldAlert } from 'lucide-react';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'w-24 h-24 rounded-3xl p-1' : 'w-11 h-11 rounded-xl p-0.5';
  return (
    <div
      className={`${box} bg-[#637d00] flex items-center justify-center shadow-md shrink-0 overflow-hidden border-2 border-[#8fa918]`}
      title="Força Teen Universal"
      aria-label="Logo Força Teen Universal"
    >
      <img
        src="/assets/images/IMG_7653.jpeg"
        alt="Força Teen Universal"
        className="w-full h-full object-contain rounded-[inherit]"
      />
    </div>
  );
}

export function Alert({ kind, message }: { kind: 'success' | 'error'; message: string }) {
  if (!message) return null;
  const style =
    kind === 'success'
      ? 'bg-green-50 border-green-300 text-green-800'
      : 'bg-red-50 border-red-300 text-red-800';
  const Icon = kind === 'success' ? ShieldCheck : ShieldAlert;
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${style}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = 'green',
  hint,
}: {
  label: string;
  value: number | string;
  tone?: 'green' | 'orange' | 'red' | 'amber' | 'sky' | 'gray';
  hint?: string;
}) {
  const tones: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    sky: 'bg-sky-50 border-sky-200 text-sky-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {hint && <p className="text-xs mt-1 opacity-70">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="font-semibold text-gray-700">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
