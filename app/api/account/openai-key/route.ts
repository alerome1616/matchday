import { createAccountKeyHandlers } from "@/lib/account-key-handlers";
import { requireAccount } from "@/lib/auth";
import {
  getApiKeyStatus,
  saveUserApiKey,
  deleteUserApiKey,
} from "@/lib/user-api-key";
export const dynamic = "force-dynamic";
export const { GET, PUT, DELETE } = createAccountKeyHandlers({
  authenticate: async () => (await requireAccount()).id,
  status: getApiKeyStatus,
  save: saveUserApiKey,
  remove: deleteUserApiKey,
});
