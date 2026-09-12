import { AlertCircle } from 'lucide-react';

export default function JoinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <div className="rounded-2xl bg-white p-8 shadow-sm max-w-sm w-full border border-slate-200">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Gym Not Found</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          The registration link you followed is invalid or incomplete. Please use the QR code or link provided by your gym's reception.
        </p>
      </div>
    </div>
  );
}
