import { createContext } from "react";
import type { User } from "../../app/types";

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void | Promise<void>;
  updateUser: (patch: Partial<User>) => void | Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
