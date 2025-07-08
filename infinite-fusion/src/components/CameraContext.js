import React, { createContext, useContext } from "react";

export const CameraContext = createContext();

export function useCameraStream() {
  return useContext(CameraContext);
} 