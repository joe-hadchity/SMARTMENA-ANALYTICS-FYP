import { redirect } from "next/navigation";

export default function PostsRedirectPage() {
  redirect("/content?view=grid");
}
