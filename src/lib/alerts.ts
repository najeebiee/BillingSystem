import Swal from "sweetalert2";

export async function confirmDiscardChanges() {
  const result = await Swal.fire({
    title: "Discard unsaved changes?",
    text: "All unsaved changes will be lost.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, discard",
    cancelButtonText: "Keep editing",
    reverseButtons: true,
    focusCancel: true,
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#2563eb"
  });

  return result.isConfirmed;
}
