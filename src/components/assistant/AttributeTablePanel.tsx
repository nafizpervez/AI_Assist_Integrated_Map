import React, { useEffect, useMemo, useState } from "react";

import type { AssistantAttributeTable } from "../../types/assistant";

interface Props {
    table: AssistantAttributeTable | null;
    onClose: () => void;
}

function IconButton({
    title,
    ariaLabel,
    onClick,
    children,
}: {
    title: string;
    ariaLabel: string;
    onClick?: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={ariaLabel}
            style={{
                width: "36px",
                height: "36px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
        >
            {children}
        </button>
    );
}

function FullscreenIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            style={{ display: "block" }}
        >
            <path
                d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            style={{ display: "block" }}
        >
            <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function formatCount(value: number | undefined): string {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "0";
    }

    return value.toLocaleString();
}

function AttributeTableContent({
    table,
    showFullscreenButton,
    onOpenFullscreen,
    onClose,
    isModal = false,
}: {
    table: AssistantAttributeTable;
    showFullscreenButton: boolean;
    onOpenFullscreen?: () => void;
    onClose: () => void;
    isModal?: boolean;
}) {
    const columns = useMemo(() => table.columns ?? [], [table.columns]);
    const rows = useMemo(() => table.rows ?? [], [table.rows]);

    const totalRows = table.totalCount ?? rows.length;
    const shownRows = table.shownCount ?? rows.length;

    return (
        <div
            style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: isModal ? "100%" : "450px",
                background: "#ffffff",
                border: isModal ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7eb",
                borderRadius: isModal ? "20px" : "14px",
                boxShadow: isModal
                    ? "0 30px 100px rgba(0,0,0,0.32)"
                    : "0 10px 30px rgba(15,23,42,0.08)",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "14px 16px",
                    borderBottom: "1px solid #e5e7eb",
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            color: "#111827",
                            lineHeight: 1.2,
                            wordBreak: "break-word",
                        }}
                    >
                        {table.title}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
                            fontSize: "12px",
                            color: "#6b7280",
                        }}
                    >
                        <span
                            style={{
                                padding: "3px 8px",
                                borderRadius: "999px",
                                background: "#f3f4f6",
                                border: "1px solid #e5e7eb",
                            }}
                        >
                            Rows: {formatCount(shownRows)}
                        </span>

                        <span
                            style={{
                                padding: "3px 8px",
                                borderRadius: "999px",
                                background: "#f3f4f6",
                                border: "1px solid #e5e7eb",
                            }}
                        >
                            Total: {formatCount(totalRows)}
                        </span>

                        <span
                            style={{
                                padding: "3px 8px",
                                borderRadius: "999px",
                                background: "#f3f4f6",
                                border: "1px solid #e5e7eb",
                            }}
                        >
                            Columns: {formatCount(columns.length)}
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexShrink: 0,
                    }}
                >
                    {showFullscreenButton && (
                        <IconButton
                            title="Open fullscreen"
                            ariaLabel="Open fullscreen"
                            onClick={onOpenFullscreen}
                        >
                            <FullscreenIcon />
                        </IconButton>
                    )}

                    <IconButton title="Close" ariaLabel="Close" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </div>
            </div>

            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    background: "#ffffff",
                    padding: "12px",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        maxWidth: "100%",
                        overflowX: "auto",
                        overflowY: "auto",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        background: "#ffffff",
                    }}
                >
                    <table
                        style={{
                            borderCollapse: "separate",
                            borderSpacing: 0,
                            width: "max-content",
                            minWidth: "100%",
                            tableLayout: "auto",
                        }}
                    >
                        <thead>
                            <tr>
                                {columns.map((column, index) => (
                                    <th
                                        key={`${column}-${index}`}
                                        style={{
                                            position: "sticky",
                                            top: 0,
                                            zIndex: 2,
                                            padding: "11px 12px",
                                            borderBottom: "1px solid #d1d5db",
                                            borderRight: "1px solid #e5e7eb",
                                            textAlign: "left",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#111827",
                                            whiteSpace: "nowrap",
                                            background: "#f8fafc",
                                            backdropFilter: "blur(4px)",
                                        }}
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length || 1}
                                        style={{
                                            padding: "20px",
                                            fontSize: "13px",
                                            color: "#6b7280",
                                            textAlign: "center",
                                        }}
                                    >
                                        No rows found.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, rowIndex) => (
                                    <tr
                                        key={`row-${rowIndex}`}
                                        style={{
                                            background: rowIndex % 2 === 0 ? "#ffffff" : "#fcfcfd",
                                        }}
                                    >
                                        {columns.map((column, colIndex) => (
                                            <td
                                                key={`${rowIndex}-${column}-${colIndex}`}
                                                style={{
                                                    padding: "10px 12px",
                                                    borderBottom: "1px solid #f1f5f9",
                                                    borderRight: "1px solid #f8fafc",
                                                    fontSize: "13px",
                                                    color: "#111827",
                                                    verticalAlign: "top",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {row?.[column] !== null &&
                                                    row?.[column] !== undefined &&
                                                    row?.[column] !== ""
                                                    ? String(row[column])
                                                    : "-"}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function AttributeTablePanel({ table, onClose }: Props) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!isFullscreen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsFullscreen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isFullscreen]);

    if (!table) return null;

    const closeFullscreenOnly = () => {
        setIsFullscreen(false);
    };

    return (
        <>
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 0,
                    minWidth: 0,
                }}
            >
                <AttributeTableContent
                    table={table}
                    onClose={onClose}
                    showFullscreenButton={true}
                    onOpenFullscreen={() => setIsFullscreen(true)}
                />
            </div>

            {isFullscreen && (
                <div
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeFullscreenOnly();
                        }
                    }}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        background: "rgba(2, 6, 23, 0.68)",
                        backdropFilter: "blur(6px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px",
                    }}
                >
                    <div
                        onMouseDown={(event) => event.stopPropagation()}
                        style={{
                            width: "92vw",
                            height: "90vh",
                            maxWidth: "92vw",
                            maxHeight: "90vh",
                        }}
                    >
                        <AttributeTableContent
                            table={table}
                            onClose={closeFullscreenOnly}
                            showFullscreenButton={false}
                            isModal={true}
                        />
                    </div>
                </div>
            )}
        </>
    );
}