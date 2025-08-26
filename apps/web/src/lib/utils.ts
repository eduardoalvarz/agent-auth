import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Always disable Google Auth in the UI.
 * The buttons in Signin/Signup check this function.
 */
export function googleAuthDisabled() {
  return true;
}
