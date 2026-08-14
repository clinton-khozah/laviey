import type { NavigationProp } from "@react-navigation/native";
import { SlidePanelModal } from "../../components/common/SlidePanelModal";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { SettingsPanel } from "./SettingsPanel";

export function SettingsModal({
  visible,
  onClose,
  navigation,
}: {
  visible: boolean;
  onClose(): void;
  navigation: NavigationProp<RootStackParamList>;
}) {
  return (
    <SlidePanelModal visible={visible} onClose={onClose}>
      <SettingsPanel onClose={onClose} navigation={navigation} />
    </SlidePanelModal>
  );
}
