import { promptExamples } from "../../data/promptExamples";

interface Props {
    onSelect: (value: string) => void;
}

export default function PromptExamples({ onSelect }: Props) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "12px",
                background: "#fff",
            }}
        >
            <div style={{ fontWeight: 700, marginBottom: "8px", color: "#111827" }}>
                Example prompts
            </div>

            <div style={{ display: "grid", gap: "8px" }}>
                {promptExamples.map((item) => (
                    <button
                        key={item}
                        onClick={() => onSelect(item)}
                        style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            border: "1px solid #d1d5db",
                            background: "#f9fafb",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                        }}
                    >
                        {item}
                    </button>
                ))}
            </div>
        </div>
    );
}