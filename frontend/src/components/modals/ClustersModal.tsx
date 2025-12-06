import { Modal } from "./Modal";
import { useModal } from "../../hooks/useModal";
import { ClusterList } from "../shared/ClusterList";

export function ClustersModal() {
  const { isOpen, close } = useModal("clusters");

  return (
    <Modal isOpen={isOpen} onClose={close} title="Package Clusters" size="md">
      <ClusterList />
    </Modal>
  );
}
