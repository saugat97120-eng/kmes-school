import { useState, useCallback } from "react";
import { IStudentContext } from "./studentPortalContext";
import IStudentModal from "../components/common/IStudentModal";

export function IStudentProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openPortal = useCallback(() => setIsOpen(true), []);
  const closePortal = useCallback(() => setIsOpen(false), []);

  return (
    <IStudentContext.Provider value={{ isOpen, openPortal, closePortal }}>
      {children}
      <IStudentModal isOpen={isOpen} onClose={closePortal} />
    </IStudentContext.Provider>
  );
}
