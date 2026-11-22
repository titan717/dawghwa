import { useEffect, useState } from "react";
import type { TasteEvidence } from "@/lib/intel/confidence";
import { loadTasteEvidence, useIntel } from "@/lib/intel/runtime";
import { useUser } from "@/lib/store/user";

/**
 * "Taste signal: early / growing / strong" — a transparency aid showing how
 * much this device has to go on. Not an accuracy score: it never states a
 * percentage or a probability. See src/lib/intel/confidence.ts.
 */
export function TasteSignalView({ evidence, because }: { evidence: TasteEvidence; because?: string }) {
  const n = evidence.nEff;
  const based = `Based on ${n} of your ${n === 1 ? "read" : "reads"} and ratings on this device`;
  return (
    <p className="muted taste-signal" style={{ fontSize: "var(--text-xs)", marginTop: 12 }} title={`${based}. A guide to how much there is to go on, not a measure of accuracy.`}>
      <strong style={{ color: "var(--ink)", fontWeight: 600 }}>Taste signal: {evidence.label}</strong>
      {" · "}
      {n} useful {n === 1 ? "interaction" : "interactions"}
      <br />
      {because ? `Because you read ${because}. ` : ""}
      {based}.
    </p>
  );
}

/** Live version for the active profile; refreshes whenever the model retrains. */
export function TasteSignal() {
  const state = useIntel();
  const profileId = useUser((s) => s.profile?.id);
  const [data, setData] = useState<{ evidence: TasteEvidence; because?: string } | null>(null);
  const trainedAt = state?.trainedAt ?? 0;
  useEffect(() => {
    let live = true;
    void loadTasteEvidence(profileId)
      .then((r) => {
        if (!live) return;
        if (!r) return setData(null);
        const top = r.evidence.topTitleKey ? r.titles.get(r.evidence.topTitleKey)?.title : undefined;
        setData({ evidence: r.evidence, because: top });
      })
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [profileId, trainedAt]);
  if (!data) return null;
  return <TasteSignalView evidence={data.evidence} because={data.because} />;
}
