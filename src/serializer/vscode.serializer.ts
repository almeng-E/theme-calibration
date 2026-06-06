import { SETTINGS_ORDER } from "../constants";
import type { ConfigurationSnapshot, ConfigurationUpdate } from "../types/patch.types";
import { clonePlainSetting } from "../utils/objectUtils";

export function serializeSettingsUpdates(settingsById: ConfigurationSnapshot): ConfigurationUpdate[] {
  return SETTINGS_ORDER.map((settingId) => {
    const [section, ...keyParts] = settingId.split(".");
    return {
      section,
      key: keyParts.join("."),
      value: clonePlainSetting(settingsById[settingId])
    };
  });
}
