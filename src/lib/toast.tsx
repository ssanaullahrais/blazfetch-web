// Notifications use react-hot-toast (https://react-hot-toast.com). Everything imports it from here, so the
// library is only referenced in this file and in the toaster host (app-toaster.tsx).
import toast, { Toaster, useToasterStore } from "react-hot-toast";

export { Toaster, useToasterStore };
export default toast;
