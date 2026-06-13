import { useT } from "../../lib/i18n/context";

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title, message, confirmLabel, danger, onConfirm, onCancel,
}: Props) {
  const { t } = useT();
  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal admin-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h3 className="admin-modal__title">
            <i className={`ti ${danger ? "ti-alert-triangle" : "ti-help-circle"}`} />
            {title}
          </h3>
        </div>
        <div className="admin-modal__body">
          <p className="admin-confirm-text">{message}</p>
        </div>
        <div className="admin-modal__footer">
          <button className="admin-btn admin-btn--ghost" onClick={onCancel}>{t("common.cancel")}</button>
          <button
            className={`admin-btn ${danger ? "admin-btn--danger" : "admin-btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel ?? t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
