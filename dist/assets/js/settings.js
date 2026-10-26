import {
  applyMotionPreference,
  boot,
  current,
  fail,
  motionReduced,
  qs,
  setMotionReduced,
  signOut
} from "./chunks/chunk-EIGZ5BRM.js";

// src/ts/pages/settings.ts
boot(() => {
  const profile = current().profile;
  qs("#whoName").textContent = profile.username;
  qs("#whoMail").textContent = profile.email ?? "";
  const motion = qs("#reduceMotion");
  motion.checked = motionReduced();
  motion.addEventListener("change", () => setMotionReduced(motion.checked));
  applyMotionPreference();
  qs("#signOut").addEventListener("click", async () => {
    try {
      await signOut();
      location.href = "/";
    } catch (error) {
      fail(error.message);
    }
  });
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjL3RzL3BhZ2VzL3NldHRpbmdzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBzaWduT3V0IH0gZnJvbSBcIi4uL2FwaS9hdXRoXCI7XG5pbXBvcnQgeyBib290IH0gZnJvbSBcIi4uL2NvcmUvYm9vdFwiO1xuaW1wb3J0IHsgcXMgfSBmcm9tIFwiLi4vY29yZS9kb21cIjtcbmltcG9ydCB7IGN1cnJlbnQgfSBmcm9tIFwiLi4vY29yZS9zZXNzaW9uXCI7XG5pbXBvcnQgeyBmYWlsIH0gZnJvbSBcIi4uL2NvcmUvdG9hc3RcIjtcbmltcG9ydCB7IGFwcGx5TW90aW9uUHJlZmVyZW5jZSwgbW90aW9uUmVkdWNlZCwgc2V0TW90aW9uUmVkdWNlZCB9IGZyb20gXCIuLi9jb3JlL3RoZW1lXCI7XG5cbmJvb3QoKCkgPT4ge1xuICBjb25zdCBwcm9maWxlID0gY3VycmVudCgpLnByb2ZpbGUhO1xuICBxcyhcIiN3aG9OYW1lXCIpLnRleHRDb250ZW50ID0gcHJvZmlsZS51c2VybmFtZTtcbiAgcXMoXCIjd2hvTWFpbFwiKS50ZXh0Q29udGVudCA9IHByb2ZpbGUuZW1haWwgPz8gXCJcIjtcblxuICBjb25zdCBtb3Rpb24gPSBxczxIVE1MSW5wdXRFbGVtZW50PihcIiNyZWR1Y2VNb3Rpb25cIik7XG4gIG1vdGlvbi5jaGVja2VkID0gbW90aW9uUmVkdWNlZCgpO1xuICBtb3Rpb24uYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiBzZXRNb3Rpb25SZWR1Y2VkKG1vdGlvbi5jaGVja2VkKSk7XG4gIGFwcGx5TW90aW9uUHJlZmVyZW5jZSgpO1xuXG4gIHFzKFwiI3NpZ25PdXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2lnbk91dCgpO1xuICAgICAgbG9jYXRpb24uaHJlZiA9IFwiL1wiO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBmYWlsKChlcnJvciBhcyBFcnJvcikubWVzc2FnZSk7XG4gICAgfVxuICB9KTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7O0FBT0EsS0FBSyxNQUFNO0FBQ1QsUUFBTSxVQUFVLFFBQVEsRUFBRTtBQUMxQixLQUFHLFVBQVUsRUFBRSxjQUFjLFFBQVE7QUFDckMsS0FBRyxVQUFVLEVBQUUsY0FBYyxRQUFRLFNBQVM7QUFFOUMsUUFBTSxTQUFTLEdBQXFCLGVBQWU7QUFDbkQsU0FBTyxVQUFVLGNBQWM7QUFDL0IsU0FBTyxpQkFBaUIsVUFBVSxNQUFNLGlCQUFpQixPQUFPLE9BQU8sQ0FBQztBQUN4RSx3QkFBc0I7QUFFdEIsS0FBRyxVQUFVLEVBQUUsaUJBQWlCLFNBQVMsWUFBWTtBQUNuRCxRQUFJO0FBQ0YsWUFBTSxRQUFRO0FBQ2QsZUFBUyxPQUFPO0FBQUEsSUFDbEIsU0FBUyxPQUFPO0FBQ2QsV0FBTSxNQUFnQixPQUFPO0FBQUEsSUFDL0I7QUFBQSxFQUNGLENBQUM7QUFDSCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
