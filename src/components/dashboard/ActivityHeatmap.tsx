"use client";

import React, { useState } from "react";
import { Activity, Flame, Calendar, CheckCircle2, GitCommit, Star, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  activityType?: "submission" | "rating" | "comment" | "showcase";
}

// Generate realistic mock developer activity data for the last 20 weeks (140 days)
function generateMockHeatmap(): ActivityDay[] {
  const days: ActivityDay[] = [];
  const today = new Date();
  
  for (let i = 139; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    
    // Seed pseudo-realistic high activity on weekdays, lighter on weekends
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Random activity count biased towards weekdays
    let raw = (Math.sin(i * 0.4) + Math.cos(i * 0.15) + 2) * (isWeekend ? 0.8 : 2.2);
    let count = Math.max(0, Math.floor(raw));
    
    // Higher activity for recent weeks
    if (i < 20) count += 2;
    
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0 && count <= 2) level = 1;
    else if (count > 2 && count <= 4) level = 2;
    else if (count > 4 && count <= 7) level = 3;
    else if (count > 7) level = 4;

    const activityTypes: Array<"submission" | "rating" | "comment" | "showcase"> = [
      "rating",
      "comment",
      "submission",
      "rating",
    ];

    days.push({
      date: dateStr,
      count,
      level,
      activityType: count > 0 ? activityTypes[i % activityTypes.length] : undefined,
    });
  }
  return days;
}

const HEATMAP_DATA = generateMockHeatmap();

export function ActivityHeatmap() {
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);

  const totalContributions = HEATMAP_DATA.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 w-full min-w-0 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            {totalContributions} Architecture Contributions &amp; Peer Reviews in 2026
          </h4>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <Flame className="w-3 h-3 fill-emerald-500 text-emerald-500" /> 16-day active streak
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-1 max-w-full overscroll-x-contain">
        <div className="min-w-[620px]">
          {/* Months header aligned with weeks */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5 pl-7 pr-2">
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
          </div>

          <div className="flex items-start gap-1.5">
            {/* Weekday labels (GitHub style Mon / Wed / Fri) */}
            <div
              className="grid grid-flow-row gap-1 text-[9px] font-mono text-slate-400 select-none pr-1 pt-0.5"
              style={{ gridTemplateRows: "repeat(7, 12px)" }}
            >
              <span className="h-3 leading-3" />
              <span className="h-3 leading-3">Mon</span>
              <span className="h-3 leading-3" />
              <span className="h-3 leading-3">Wed</span>
              <span className="h-3 leading-3" />
              <span className="h-3 leading-3">Fri</span>
              <span className="h-3 leading-3" />
            </div>

            {/* 7 rows for days of week, 20 columns for weeks */}
            <div
              className="grid grid-flow-col gap-1 flex-1"
              style={{ gridTemplateRows: "repeat(7, 12px)" }}
            >
              {HEATMAP_DATA.map((day) => {
                let colorClass = "bg-slate-100";
                if (day.level === 1) colorClass = "bg-emerald-200";
                else if (day.level === 2) colorClass = "bg-emerald-400";
                else if (day.level === 3) colorClass = "bg-emerald-500";
                else if (day.level === 4) colorClass = "bg-emerald-600";

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={cn(
                      "w-3 h-3 rounded-[3px] transition-all cursor-pointer hover:ring-1 hover:ring-slate-900/40",
                      colorClass
                    )}
                    title={`${day.count} contributions on ${day.date}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Details & Legend */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="h-4">
          {hoveredDay ? (
            <span className="text-slate-900 font-mono">
              <strong>{hoveredDay.count}</strong> contribution{hoveredDay.count === 1 ? "" : "s"} on{" "}
              {hoveredDay.date}
            </span>
          ) : (
            <span className="text-slate-400">Hover over any square for activity details</span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-100" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
