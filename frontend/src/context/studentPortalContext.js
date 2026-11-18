import { createContext } from "react";

export const IStudentContext = createContext({
  isOpen: false,
  openPortal: () => {},
  closePortal: () => {},
});
