import api from "./api";

export type Module = "Auth" | "Bookings" | "Income" | "Expenses" | "Users" | "Settings" | "Reports" | "Profile";

export async function logActivity(action: string, module: Module, detail: string) {
  try {
    await api.post("/activity", { action, module, detail });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

