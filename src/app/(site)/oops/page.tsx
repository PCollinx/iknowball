import { breakOnPurpose } from "@/lib/errors-preview";

export default async function Oops() {
  return breakOnPurpose("a page");
}
