'use client';

import { useState } from 'react';

export default function ExpenseClaimSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      onClick={(event) => {
        const form = event.currentTarget.form;
        if (form && !form.reportValidity()) return;
        setPending(true);
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
