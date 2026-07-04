import { CheckIcon, ChevronDownIcon, LockIcon } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import VisibilityIcon from "@/components/VisibilityIcon";
import { Visibility } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";
import type { VisibilitySelectorProps } from "../types";

const VisibilitySelector = (props: VisibilitySelectorProps) => {
  const { value, onChange, privacyLock } = props;
  const t = useTranslate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<Visibility | null>(null);

  const visibilityOptions = [
    { value: Visibility.PRIVATE, label: t("memo.visibility.private") },
    { value: Visibility.PROTECTED, label: t("memo.visibility.protected") },
    { value: Visibility.PUBLIC, label: t("memo.visibility.public") },
  ] as const;

  const currentLabel = visibilityOptions.find((option) => option.value === value)?.label || "";

  const handleOptionClick = (target: Visibility) => {
    // Only show confirmation when privacy lock is enabled and switching to PUBLIC
    if (privacyLock && target === Visibility.PUBLIC && value !== Visibility.PUBLIC) {
      setPendingVisibility(target);
      setConfirmOpen(true);
    } else {
      onChange(target);
    }
  };

  const handleConfirm = () => {
    if (pendingVisibility !== null) {
      onChange(pendingVisibility);
    }
    setPendingVisibility(null);
  };

  return (
    <>
      <DropdownMenu onOpenChange={props.onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex items-center h-8 px-2 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors">
            <VisibilityIcon visibility={value} className="opacity-60 mr-1.5" />
            <span>{currentLabel}</span>
            {privacyLock && <LockIcon className="ml-1 w-3 h-3 opacity-50" />}
            <ChevronDownIcon className="ml-0.5 w-4 h-4 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {visibilityOptions.map((option) => (
            <DropdownMenuItem key={option.value} className="cursor-pointer gap-2" onClick={() => handleOptionClick(option.value)}>
              <VisibilityIcon visibility={option.value} />
              <span className="flex-1">{option.label}</span>
              {value === option.value && <CheckIcon className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("editor.visibility.privacy-lock-confirm-title")}
        description={t("editor.visibility.privacy-lock-confirm-description")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default VisibilitySelector;
