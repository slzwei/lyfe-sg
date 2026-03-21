"use client";

import { staffLogout } from "../actions";

export default function LogoutButton() {
  return (
    <button
      onClick={() => staffLogout()}
      className="rounded-lg px-3 py-1.5 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
    >
      Sign out
    </button>
  );
}
