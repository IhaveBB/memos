import { create } from "@bufbuild/protobuf";
import { FieldMaskSchema } from "@bufbuild/protobuf/wkt";
import { Globe2Icon, LockIcon, UsersIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { memoServiceClient } from "@/connect";
import { buildMemoCreatorFilter } from "@/helpers/resource-names";
import { handleError } from "@/lib/error";
import useCurrentUser from "@/hooks/useCurrentUser";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { ListMemosRequestSchema, MemoSchema, Visibility } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import SettingGroup from "./SettingGroup";
import SettingSection from "./SettingSection";

type FilterType = "all" | "public" | "protected";

const PrivacyAuditSection = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchMemos = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const creatorFilter = buildMemoCreatorFilter(currentUser.name);
      const filterStr = creatorFilter ? `${creatorFilter} && visibility in ["PUBLIC", "PROTECTED"]` : `visibility in ["PUBLIC", "PROTECTED"]`;
      const resp = await memoServiceClient.listMemos(
        create(ListMemosRequestSchema, {
          filter: filterStr,
          pageSize: 100,
        } as Record<string, unknown>),
      );
      setMemos(resp.memos);
    } catch (error) {
      console.error("Failed to fetch memos for privacy audit:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  const handleChangeVisibility = async (memo: Memo, newVisibility: Visibility) => {
    try {
      await memoServiceClient.updateMemo({
        memo: create(MemoSchema, { name: memo.name, visibility: newVisibility }),
        updateMask: create(FieldMaskSchema, { paths: ["visibility"] }),
      });
      toast.success(t("message.update-succeed"));
      // Refresh the list
      fetchMemos();
    } catch (error) {
      handleError(error, toast.error, { context: "Update memo visibility" });
    }
  };

  const filteredMemos = memos.filter((memo) => {
    if (filter === "public") return memo.visibility === Visibility.PUBLIC;
    if (filter === "protected") return memo.visibility === Visibility.PROTECTED;
    return true;
  });

  const publicCount = memos.filter((m) => m.visibility === Visibility.PUBLIC).length;
  const protectedCount = memos.filter((m) => m.visibility === Visibility.PROTECTED).length;

  return (
    <SettingSection title={t("setting.privacy-audit.title")}>
      <SettingGroup description={t("setting.privacy-audit.description")}>
        <div className="space-y-4">
          {/* Stats and filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Globe2Icon className="w-4 h-4 text-red-500" />
                <span className="text-muted-foreground">{t("setting.privacy-audit.public-count", { count: publicCount })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <UsersIcon className="w-4 h-4 text-blue-500" />
                <span className="text-muted-foreground">{t("setting.privacy-audit.protected-count", { count: protectedCount })}</span>
              </div>
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("setting.privacy-audit.filter-all")}</SelectItem>
                <SelectItem value="public">{t("setting.privacy-audit.filter-public")}</SelectItem>
                <SelectItem value="protected">{t("setting.privacy-audit.filter-protected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Memo list */}
          {loading ? (
            <div className="px-3 py-8 text-sm text-muted-foreground text-center">…</div>
          ) : filteredMemos.length === 0 ? (
            <div className="text-center py-8">
              <LockIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">{t("setting.privacy-audit.no-public-memos")}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredMemos.map((memo) => (
                <div
                  key={memo.name}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{memo.content.slice(0, 100)}{memo.content.length > 100 ? "..." : ""}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {memo.createTime ? new Date(memo.createTime.seconds * 1000).toLocaleDateString() : ""}
                      </span>
                      {memo.visibility === Visibility.PUBLIC && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <Globe2Icon className="w-3 h-3" />
                          {t("memo.visibility.public")}
                        </span>
                      )}
                      {memo.visibility === Visibility.PROTECTED && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <UsersIcon className="w-3 h-3" />
                          {t("memo.visibility.protected")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleChangeVisibility(memo, Visibility.PRIVATE)}
                  >
                    <LockIcon className="w-3.5 h-3.5 mr-1" />
                    {t("setting.privacy-audit.change-to-private")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SettingGroup>
    </SettingSection>
  );
};

export default PrivacyAuditSection;
