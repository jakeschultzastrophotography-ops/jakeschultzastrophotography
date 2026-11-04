import { useId, useRef, useState } from "react";
import PrintConfigurator from "./PrintConfigurator";

export default function PrintOrderButton({ photograph }) {
  const dialog = useRef(null);
  const [opened, setOpened] = useState(false);
  const titleId = useId();
  return (
    <>
      <button type="button" onClick={() => { setOpened(true); dialog.current.showModal(); }}
        className="my-3 rounded-full border border-[#D8C18F]/40 bg-[#D8C18F]/10 px-4 py-2 text-sm font-semibold text-[#F3DEAA] hover:bg-[#D8C18F]/20 focus-visible:outline focus-visible:outline-2">
        Order a Print
      </button>
      <dialog ref={dialog} aria-labelledby={titleId}
        className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-white/20 bg-[#10151e] p-6 text-white backdrop:bg-black/80">
        <form method="dialog" className="flex justify-end">
          <button autoFocus className="rounded-lg border border-white/30 px-3 py-2">Close</button>
        </form>
        {opened && <PrintConfigurator photograph={photograph} titleId={titleId} />}
      </dialog>
    </>
  );
}
