export function dashboardPathForRole(role: string | null | undefined): string {
  switch (role) {
    case "patient":
      return "/dashboard";
    case "specialist":
      return "/specialist/dashboard";
    case "hospital":
      return "/hospital/dashboard";
    case "insurer":
      return "/insurer/dashboard";
    case "admin":
      return "/admin";
    default:
      return "/onboarding/subscription";
  }
}
