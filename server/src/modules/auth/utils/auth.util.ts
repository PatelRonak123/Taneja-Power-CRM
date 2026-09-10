export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};
