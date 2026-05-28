import { redirect } from "next/navigation";

export default function CalendarRedirectPage() {
  redirect("/content?view=calendar");
}
