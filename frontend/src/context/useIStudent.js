import { useContext } from "react";
import { IStudentContext } from "./studentPortalContext";

export function useIStudent() {
  const context = useContext(IStudentContext);
  if (!context) {
    return {
      isOpen: false,
      openPortal: () => {},
      closePortal: () => {},
    };
  }
  return context;
}
