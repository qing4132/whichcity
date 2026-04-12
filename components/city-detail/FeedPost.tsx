type Tier = "good" | "mid" | "bad";

interface StatItem {
    label: string;
    value: string;
    detail?: string;
}

interface FeedPostProps {
    icon?: string;
    title: string;
    rank?: string;
    bigValue?: string;
    valueTier?: Tier;
    stats?: StatItem[];
    description?: string;
    darkMode: boolean;
    cardValCls: (t: Tier) => string;
    children?: React.ReactNode;
}

/** Reusable feed post component — like a social media post */
export default function FeedPost({ icon, title, rank, bigValue, valueTier, stats, description, darkMode, cardValCls, children }: FeedPostProps) {
    const headCls = darkMode ? "text-slate-100" : "text-slate-900";
    const labelCls = darkMode ? "text-slate-400" : "text-slate-400";
    const subCls = darkMode ? "text-slate-500" : "text-slate-500";
    const divider = darkMode ? "border-slate-800" : "border-slate-100";
    const rankCls = darkMode ? "text-green-400" : "text-green-600";

    return (
        <div className={`py-3.5 border-b ${divider}`}>
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1.5">
                {icon && <span className="text-[15px]">{icon}</span>}
                <span className={`text-[15px] font-extrabold ${headCls}`}>{title}</span>
                {rank && <span className={`text-[13px] font-semibold ${rankCls}`}>{rank}</span>}
            </div>

            {/* Big value */}
            {bigValue && (
                <div className={`text-[45px] font-black leading-none mb-1 ${valueTier ? cardValCls(valueTier) : headCls}`}>
                    {bigValue}
                </div>
            )}

            {/* Stat grid */}
            {stats && stats.length > 0 && (
                <div className="flex gap-4 mb-1">
                    {stats.map(s => (
                        <div key={s.label}>
                            <div className={`text-[30px] font-black ${headCls}`}>{s.value}</div>
                            <div className={`text-[12px] ${labelCls}`}>{s.label}</div>
                            {s.detail && <div className={`text-[12px] ${labelCls}`}>{s.detail}</div>}
                        </div>
                    ))}
                </div>
            )}

            {/* Custom children */}
            {children}

            {/* Description */}
            {description && (
                <div className={`text-[13px] leading-normal ${subCls}`}>{description}</div>
            )}
        </div>
    );
}
