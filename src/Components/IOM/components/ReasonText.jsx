import React from "react";
import { Tooltip } from "antd";

/**
 * Shows the first `max` characters of a reason followed by "...".
 * Hover shows the full text in a tooltip.
 */
const ReasonText = ({ text, max = 15, emptyText = "—" }) => {
    const value = String(text ?? "").trim();
    if (!value) return <span className="text-muted">{emptyText}</span>;

    if (value.length <= max) return <span>{value}</span>;

    return (
        <Tooltip
            title={value}
            placement="topLeft"
            overlayStyle={{ maxWidth: 360 }}
            overlayInnerStyle={{ borderRadius: 10, padding: "8px 12px", fontSize: 13, lineHeight: 1.5 }}
        >
            <span style={{ cursor: "help", borderBottom: "1px dashed #d0d5dd" }}>
                {value.slice(0, max).trimEnd()}...
            </span>
        </Tooltip>
    );
};

export default ReasonText;