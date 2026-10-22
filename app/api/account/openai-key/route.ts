import { createAccountKeyHandlers } from "@/lib/account-key-handlers";
import { requireUser } from "@/lib/supabase/server";
import {
  getApiKeyStatus,
  saveUserApiKey,
  deleteUserApiKey,
} from "@/lib/user-api-key";
export const dynamic = "force-dynamic";
export const { GET, PUT, DELETE } = createAccountKeyHandlers({
  authenticate: async () => (await requireUser()).user.id,
  status: getApiKeyStatus,
  save: saveUserApiKey,
  remove: deleteUserApiKey,
});
