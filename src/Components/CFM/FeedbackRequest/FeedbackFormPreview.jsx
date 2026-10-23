// =============================================================
// Feedback Form Preview — the form exactly as the customer sees it
//
// Path: src/Components/CFM/pages/FeedbackFormPreview.jsx
//
// Shared by:
//   FeedbackRequestSetup  — the "Review form" step
//   FeedbackRequest       — the "View form" pop-up on each row
//
// It only draws. Callers hand it rows already sorted, each with a `kind`
// ("rating" | "yesno" | "text") worked out by kindResolver below.
//
// readOnly locks every control — for a form the customer has already
// submitted, where a blank answer means they left it blank.
// =============================================================

import React, { useState } from "react";
import { Rate, Input } from "antd";

const { TextArea } = Input;

// Type ids answered with stars rather than text. Used as a fallback — the
// type's own name is checked first, so a type called "Rating" works whatever
// its id.
export const RATING_TYPE_IDS = [113];

export const YES_NO_PATTERN = /yes\s*\/?\s*no|boolean/i;

export const hasAnswer = (row) =>
    row.Answer !== null && row.Answer !== undefined && String(row.Answer).trim() !== "";

// A star answer has to be a whole number 1-5. Anything else on a rating row
// means the request item's type and its answer disagree — shown as text
// rather than forced into stars.
export const starValue = (answer) => {
    const value = Number(answer);
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0;
};

// Builds the type helpers from the GetMasterTypes rows. A row can carry its
// own TypeName (the public form does); that wins over the master lookup.
export const kindResolver = (types = []) => {
    const typeNameOf = (typeId, ownName) =>
        ownName ||
        types.find((type) => Number(type.Id) === Number(typeId))?.TypeName ||
        (RATING_TYPE_IDS.includes(Number(typeId)) ? "Rating" : "Text");

    const kindOf = (typeId, ownName) => {
        const name = typeNameOf(typeId, ownName);

        if (/rat/i.test(name) || (!ownName && RATING_TYPE_IDS.includes(Number(typeId))))
            return "rating";
        if (YES_NO_PATTERN.test(name)) return "yesno";
        return "text";
    };

    return { typeNameOf, kindOf };
};

export const initialsOf = (name) =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

// Yes / No as two plain buttons with their own colours — Yes light green,
// No light red — so the answer reads at a glance. Built by hand rather than
// with antd's Radio so no theme or disabled style can grey the answer out.
function YesNoButtons({ answer, locked }) {
    const [picked, setPicked] = useState(answer || "");
    const value = locked ? answer || "" : picked;

    const button = (option, label, icon) => (
        <button
            type="button"
            className={`efr-yn-btn ${option} ${value === option ? "on" : ""}`}
            aria-pressed={value === option}
            disabled={locked}
            onClick={() => setPicked(option)}
        >
            <i className={`bi ${icon}`}></i>
            {label}
        </button>
    );

    return (
        <div
            className={`efr-yn ${value ? `picked-${value}` : ""} ${locked ? "locked" : ""}`}
            role="group"
        >
            {button("yes", "Yes", "bi-hand-thumbs-up-fill")}
            {button("no", "No", "bi-hand-thumbs-down-fill")}
        </div>
    );
}

const yesNoValue = (answer) => {
    const text = String(answer ?? "").trim().toLowerCase();
    if (["yes", "y", "1", "true"].includes(text)) return "yes";
    if (["no", "n", "0", "false"].includes(text)) return "no";
    return undefined;
};

export default function FeedbackFormPreview({
    customerName,
    logoSrc,
    onLogoError,
    periodText,
    rows = [],
    badge = null,
    meta = [],
    foot = "Preview only — answers typed here aren't saved.",
    emptyText = "No questions on this form yet.",
    readOnly = false,
}) {
    const ratingRows = rows.filter((row) => row.kind === "rating");
    const yesNoRows = rows.filter((row) => row.kind === "yesno");
    const textRows = rows.filter((row) => row.kind === "text");

    // Section numbers follow whichever sections actually appear.
    let n = 0;
    const next = () => String(++n).padStart(2, "0");
    const sectionNumber = {
        rating: ratingRows.length ? next() : "",
        yesno: yesNoRows.length ? next() : "",
        text: textRows.length ? next() : "",
    };

    return (
        <div className="efr-preview">
            <div className="efr-preview-hero">
                <span className="efr-preview-logo">
                    {logoSrc ? (
                        <img src={logoSrc} alt={customerName} onError={onLogoError} />
                    ) : (
                        <span>
                            {customerName ? initialsOf(customerName) : <i className="bi bi-building"></i>}
                        </span>
                    )}
                </span>

                <div className="efr-preview-hero-text">
                    <div className="efr-preview-eyebrow">Customer Feedback</div>
                    <h2 className="efr-preview-title">
                        {customerName || "Customer not chosen"}
                    </h2>
                    <div className="efr-preview-period">
                        <i className="bi bi-calendar3 me-2"></i>
                        {periodText || "Period not chosen"}
                    </div>

                    {meta.length > 0 && (
                        <div className="efr-preview-meta">
                            {meta.map((item) => (
                                <span className="efr-preview-meta-item" key={item.key}>
                                    <i className={`bi ${item.icon} me-1`}></i>
                                    {item.text}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {badge && <div className="efr-preview-badge">{badge}</div>}
            </div>

            {rows.length === 0 && (
                <div className="efr-preview-card efr-preview-empty">
                    <i className="bi bi-inbox"></i>
                    <div>{emptyText}</div>
                </div>
            )}

            {ratingRows.length > 0 && (
                <div className="efr-preview-card">
                    <div className="efr-preview-head">
                        <span className="efr-preview-step">{sectionNumber.rating}</span>
                        <div>
                            <h3>Rate Our Performance</h3>
                            <p>Tap the stars to rate each parameter from 1 to 5.</p>
                        </div>
                    </div>

                    {ratingRows.map((row, index) => (
                        <div className="efr-rate-row" key={row.key}>
                            <span className="efr-rate-index">{index + 1}</span>

                            <div className="efr-rate-text">
                                <div className="efr-rate-title">
                                    {row.ContentText}
                                    {row.IsRequired && <span className="efr-req">*</span>}
                                </div>
                                <div className="efr-rate-hint">
                                    {!hasAnswer(row)
                                        ? readOnly
                                            ? "Not answered"
                                            : "Select a rating"
                                        : starValue(row.Answer)
                                        ? `Answered: ${starValue(row.Answer)} / 5`
                                        : `Answered (as text): “${row.Answer}”`}
                                </div>
                            </div>

                            <Rate
                                className="efr-stars"
                                disabled={readOnly || hasAnswer(row)}
                                defaultValue={starValue(row.Answer)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {yesNoRows.length > 0 && (
                <div className="efr-preview-card">
                    <div className="efr-preview-head">
                        <span className="efr-preview-step">{sectionNumber.yesno}</span>
                        <div>
                            <h3>Quick Questions</h3>
                            <p>A simple yes or no for each.</p>
                        </div>
                    </div>

                    {yesNoRows.map((row, index) => (
                        <div className="efr-rate-row" key={row.key}>
                            <span className="efr-rate-index">{index + 1}</span>

                            <div className="efr-rate-text">
                                <div className="efr-rate-title">
                                    {row.ContentText}
                                    {row.IsRequired && <span className="efr-req">*</span>}
                                </div>
                                <div className="efr-rate-hint">
                                    {hasAnswer(row) ? (
                                        yesNoValue(row.Answer) ? (
                                            <>
                                                Answered:{" "}
                                                <span className={`efr-yn-pill ${yesNoValue(row.Answer)}`}>
                                                    <i
                                                        className={`bi ${
                                                            yesNoValue(row.Answer) === "yes"
                                                                ? "bi-hand-thumbs-up-fill"
                                                                : "bi-hand-thumbs-down-fill"
                                                        }`}
                                                    ></i>
                                                    {yesNoValue(row.Answer) === "yes" ? "Yes" : "No"}
                                                </span>
                                            </>
                                        ) : (
                                            `Answered: ${row.Answer}`
                                        )
                                    ) : readOnly ? (
                                        "Not answered"
                                    ) : (
                                        "Choose one"
                                    )}
                                </div>
                            </div>

                            <YesNoButtons
                                answer={yesNoValue(row.Answer)}
                                locked={readOnly || hasAnswer(row)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {textRows.length > 0 && (
                <div className="efr-preview-card">
                    <div className="efr-preview-head">
                        <span className="efr-preview-step">{sectionNumber.text}</span>
                        <div>
                            <h3>Customer Comments</h3>
                            <p>Share your thoughts — every word helps us improve.</p>
                        </div>
                    </div>

                    <div className="row g-3">
                        {textRows.map((row) => (
                            <div className="col-12 col-lg-6" key={row.key}>
                                <div className="efr-answer-label">
                                    {row.ContentText}
                                    {row.IsRequired && <span className="efr-req">*</span>}
                                </div>

                                <TextArea
                                    rows={3}
                                    maxLength={500}
                                    showCount
                                    readOnly={readOnly || hasAnswer(row)}
                                    defaultValue={hasAnswer(row) ? row.Answer : ""}
                                    placeholder={readOnly ? "Not answered" : "Type your answer…"}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {foot && <div className="efr-preview-foot">{foot}</div>}

            <style>{previewStyles}</style>
        </div>
    );
}

const previewStyles = `
    .efr-preview {
        border-radius: 22px;
        overflow: hidden;
        background: #f4f6fb;
        border: 1px solid #e8eef5;
        padding-bottom: 22px;
    }

    .efr-preview-hero {
        position: relative;
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 28px 28px 58px;
        background: linear-gradient(135deg, #111b3a 0%, #1e2a5a 100%);
        color: #ffffff;
    }

    .efr-preview-hero-text { min-width: 0; }

    .efr-preview-logo {
        width: 64px;
        height: 64px;
        flex: none;
        border-radius: 18px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        color: #1e2a5a;
        font-size: 20px;
        font-weight: 800;
    }

    .efr-preview-logo img { width: 100%; height: 100%; object-fit: contain; padding: 6px; }

    .efr-preview-eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, .6);
    }

    .efr-preview-title { margin: 4px 0; font-size: 24px; font-weight: 800; color: #ffffff; }

    .efr-preview-period { font-size: 13px; color: rgba(255, 255, 255, .75); }

    .efr-preview-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }

    .efr-preview-meta-item {
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, .1);
        color: rgba(255, 255, 255, .85);
        font-size: 12px;
        font-weight: 600;
    }

    .efr-preview-badge { position: absolute; top: 18px; right: 20px; }

    .efr-preview-unsaved {
        display: inline-block;
        padding: 4px 12px 4px 6px;
        border-radius: 999px;
        background: rgba(245, 158, 11, .18);
        color: #fcd34d;
        font-size: 12px;
        font-weight: 700;
    }

    .efr-preview-card {
        position: relative;
        margin: -34px 22px 0;
        padding: 24px;
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 16px 40px rgba(17, 27, 58, .10);
    }

    .efr-preview-card + .efr-preview-card { margin-top: 20px; }

    .efr-preview-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 18px;
        right: 18px;
        height: 4px;
        border-radius: 0 0 4px 4px;
        background: linear-gradient(90deg, #4f46e5, #6366f1 45%, #f59e0b);
    }

    .efr-preview-empty {
        text-align: center;
        color: #8190a0;
        font-size: 13.5px;
        font-weight: 600;
    }

    .efr-preview-empty .bi { display: block; font-size: 30px; color: #b8c2cf; margin-bottom: 6px; }

    .efr-preview-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }

    .efr-preview-head h3 { margin: 0; font-size: 18px; font-weight: 800; color: #111b3a; }

    .efr-preview-head p { margin: 2px 0 0; font-size: 13px; color: #8190a0; }

    .efr-preview-step {
        width: 44px;
        height: 44px;
        flex: none;
        border-radius: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
        color: #ffffff;
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        box-shadow: 0 8px 18px rgba(79, 70, 229, .28);
    }

    .efr-rate-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 18px 14px 34px;
        border: 1px solid #eef2f7;
        border-radius: 14px;
    }

    .efr-rate-row + .efr-rate-row { margin-top: 10px; }

    .efr-rate-index {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 11px;
        font-weight: 700;
        color: #b8c2cf;
    }

    .efr-rate-text { flex: 1 1 auto; min-width: 0; }

    .efr-rate-title { font-size: 15px; font-weight: 700; color: #111b3a; }

    .efr-rate-hint { margin-top: 2px; font-size: 12.5px; color: #8190a0; }

    .efr-stars.ant-rate { flex: none; font-size: 24px; color: #f59e0b; }

    .efr-req { color: #e11d48; margin-left: 3px; }

    .efr-answer-label { margin-bottom: 8px; font-size: 14px; font-weight: 700; color: #111b3a; }

    .efr-preview textarea.ant-input { border-radius: 12px; border-color: #e8eef5; background: #fbfcfe; }

    .efr-yn {
        display: inline-flex;
        flex: none;
        gap: 6px;
    }

    .efr-yn-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 70px;
        height: 36px;
        padding: 0 14px;
        border-radius: 10px;
        border: 1.5px solid #e2e8f0;
        background: #ffffff;
        color: #64748b;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all .18s ease;
    }

    .efr-yn-btn .bi { font-size: 12px; }

    .efr-yn-btn:hover:not(:disabled) { border-color: #c7d2fe; transform: translateY(-1px); }

    .efr-yn-btn:disabled { cursor: default; }

    .efr-yn-btn.yes.on {
        background: #dcfce7 !important;
        border-color: #86efac !important;
        color: #15803d !important;
        opacity: 1 !important;
        box-shadow: 0 6px 14px -8px rgba(21, 128, 61, .55);
    }

    .efr-yn-btn.no.on {
        background: #ffe4e6 !important;
        border-color: #fda4af !important;
        color: #be123c !important;
        opacity: 1 !important;
        box-shadow: 0 6px 14px -8px rgba(190, 18, 60, .55);
    }

    /* The option that wasn't picked steps back. */
    .efr-yn.picked-yes .efr-yn-btn.no,
    .efr-yn.picked-no .efr-yn-btn.yes {
        background: #f8fafc;
        border-color: #eef2f7;
        color: #c0c8d2;
    }

    /* Read-only and unanswered: both plain. */
    .efr-yn.locked:not(.picked-yes):not(.picked-no) .efr-yn-btn {
        background: #f8fafc;
        color: #b6c0cc;
    }

    .efr-yn-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 1px 8px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 700;
    }

    .efr-yn-pill .bi { font-size: 10px; }

    .efr-yn-pill.yes { background: #dcfce7; color: #15803d; }

    .efr-yn-pill.no { background: #ffe4e6; color: #be123c; }

    .efr-preview-foot {
        margin: 18px 22px 0;
        padding: 11px 16px;
        border-radius: 12px;
        background: #eaeef5;
        color: #6b7a8d;
        font-size: 12.5px;
        text-align: center;
    }

    @media (max-width: 767.98px) {
        .efr-preview-hero { padding: 22px 18px 50px; }
        .efr-preview-card { margin: -34px 12px 0; padding: 18px 14px; }
        .efr-rate-row { flex-wrap: wrap; }
        .efr-preview-title { font-size: 20px; }
    }
`;