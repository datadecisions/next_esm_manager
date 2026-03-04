import { cookies } from "next/headers";
import { HomeContent } from "@/components/HomeContent";

export default async function Home() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("auth_user_name")?.value;
  const userName = raw ? decodeURIComponent(raw) : "Manager";
  return <HomeContent userName={userName} />;
}
