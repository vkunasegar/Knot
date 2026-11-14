import { useState } from "react";
import { BrowserShellPreferencesStorage } from "../data";
import { DesktopShell } from "./shell/DesktopShell";
import { NavigationController } from "./shell/NavigationController";
import { ShellPreferencesService } from "./shell/ShellPreferencesService";
import "./App.css";

export function App() {
  // Application composition owns concrete adapters. Constructors subscribe to
  // nothing, keeping Strict Mode initialization free of lifecycle side effects.
  const [navigation] = useState(() => new NavigationController(window));
  const [preferences] = useState(() => new ShellPreferencesService(new BrowserShellPreferencesStorage()));
  return <DesktopShell navigation={navigation} preferences={preferences} />;
}
