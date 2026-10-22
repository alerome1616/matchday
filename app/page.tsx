import { Studio } from "@/components/studio";
import { getConfig } from "@/lib/config";
export const dynamic = "force-dynamic";
export default function Home() {
  return <Studio config={getConfig()} />;
}
