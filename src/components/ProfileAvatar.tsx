import { useMemo, useState } from "react";
import type { ProfileRecord } from "@/lib/store/db";
import { useSettings } from "@/lib/settings";
import { isSafeAvatarDataUrl } from "@/lib/profile/avatar";
import { Avatar } from "./Avatar";

/** The profile's local avatar wearing its equipped frame (only while Rewards is on). */
export function ProfileAvatar({ profile, size = 36, frame }: { profile: Pick<ProfileRecord, "name" | "color" | "cosmetics" | "avatar">; size?: number; frame?: string }) {
  const { rewards } = useSettings();
  const [failedAvatar, setFailedAvatar] = useState<string | undefined>();
  const safeAvatar = useMemo(() => isSafeAvatarDataUrl(profile.avatar) ? profile.avatar : undefined, [profile.avatar]);
  const imageFailed = safeAvatar !== undefined && failedAvatar === safeAvatar;

  const f = frame ?? (rewards ? profile.cosmetics?.frame : undefined);
  const imageSize = f && f !== "none" ? Math.round(size * 0.8) : size;
  const avatar = (
    <span style={{ position: "relative", display: "inline-flex", width: imageSize, height: imageSize, overflow: "hidden", borderRadius: "50%" }}>
      <Avatar name={profile.name} color={profile.color} size={imageSize} />
      {safeAvatar && !imageFailed && (
        <img
          src={safeAvatar}
          alt=""
          aria-hidden="true"
          draggable={false}
          onError={() => setFailedAvatar(safeAvatar)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
        />
      )}
    </span>
  );

  if (!f || f === "none") return avatar;
  return (
    <span className="avatar-frame" data-frame={f} style={{ width: size, height: size }}>
      {avatar}
    </span>
  );
}