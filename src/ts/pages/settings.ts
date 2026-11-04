import { signOut } from "../api/auth";
import { boot } from "../core/boot";
import { qs } from "../core/dom";
import { current } from "../core/session";
import { fail } from "../core/toast";
import { applyMotionPreference, motionReduced, setMotionReduced } from "../core/theme";

boot(() => {
  const profile = current().profile!;
  qs("#whoName").textContent = profile.username;
  qs("#whoMail").textContent = profile.email ?? "";

  const motion = qs<HTMLInputElement>("#reduceMotion");
  motion.checked = motionReduced();
  motion.addEventListener("change", () => setMotionReduced(motion.checked));
  applyMotionPreference();

  qs("#signOut").addEventListener("click", async () => {
    try {
      await signOut();
      location.href = "/";
    } catch (error) {
      fail((error as Error).message);
    }
  });
});
