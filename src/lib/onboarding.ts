export function hasCompletedOnboarding(userId: string): boolean {
  return localStorage.getItem(`ev_onboarding_done_${userId}`) === "1";
}

export function markOnboardingComplete(userId: string): void {
  localStorage.setItem(`ev_onboarding_done_${userId}`, "1");
}
