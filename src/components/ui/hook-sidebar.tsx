"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const CORNER = 6;
const DASH =
  "repeating-linear-gradient(to top, transparent 0 2px, currentColor 2px 4px)";

export type HookSidebarItem =
  | string
  | {
      label: string;
      href?: string;
      icon?: React.ReactNode;
      id?: string;
      badge?: React.ReactNode;
      activeClassName?: string;
      className?: string;
    };

export type HookSidebarProps = Omit<ComponentProps<"nav">, "onChange"> & {
  items: HookSidebarItem[];
  label?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (index: number) => void;
  color?: string;
  dashed?: boolean;
};

const hrefOf = (item: HookSidebarItem) =>
  typeof item === "string" ? undefined : item.href;

const labelOf = (item: HookSidebarItem) =>
  typeof item === "string" ? item : item.label;

const iconOf = (item: HookSidebarItem) =>
  typeof item === "string" ? undefined : item.icon;

const badgeOf = (item: HookSidebarItem) =>
  typeof item === "string" ? undefined : item.badge;

const Rail = ({
  from = 0,
  y,
  visible,
  color,
  dashed,
  className,
}: {
  from?: number;
  y: number | null;
  visible: boolean;
  color?: string;
  dashed: boolean;
  className?: string;
}) => {
  const reduced = useReducedMotion();
  const travel = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };

  return (
    <motion.span
      aria-hidden
      initial={false}
      style={{ color }}
      animate={{ opacity: visible && y !== null ? 1 : 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.2 }}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <motion.span
        initial={false}
        animate={{ top: from, height: Math.max(0, (y ?? 0) - CORNER - from) }}
        transition={travel}
        style={
          dashed
            ? { backgroundImage: DASH }
            : { backgroundColor: "currentColor" }
        }
        className="absolute left-0.5 w-px"
      />
      <motion.svg
        initial={false}
        animate={{ top: (y ?? 0) - CORNER }}
        transition={travel}
        width="12"
        height="7"
        viewBox="0 12 7"
        fill="none"
        className="absolute left-0.5"
      >
        <path
          d="M0.5 0a6 6 0 6H12"
          stroke="currentColor"
          strokeDasharray={dashed ? "2" : undefined}
        />
      </motion.svg>
    </motion.span>
  );
};

export function HookSidebar({
  items,
  label,
  value,
  defaultValue = 0,
  onChange,
  color = "#FC4C01",
  dashed = true,
  className,
  ...props
}: HookSidebarProps) {
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);

  const routed = items.some((item) => hrefOf(item));
  const routeIndex = items.findIndex((item) => hrefOf(item) === pathname);
  const activeIndex = value ?? (routed ? routeIndex : internalValue);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () =>
      setCenters(
        itemRefs.current.map((el) =>
          el ? el.offsetTop + el.offsetHeight / 2 : 0,
        ),
      );

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items.length]);

  const activeY = activeIndex < 0 ? null : (centers[activeIndex] ?? null);
  const hoverY = hoverIndex === null ? null : (centers[hoverIndex] ?? null);

  // above the active row the accent line already covers the span, so draw only the corner
  const hoverFrom =
    activeY !== null && hoverY !== null && hoverY <= activeY
      ? Math.max(0, hoverY - CORNER)
      : (activeY ?? 0);

  const select = (index: number) => {
    if (value === undefined) setInternalValue(index);
    onChange?.(index);
  };

  return (
    <nav
      data-slot="hook-sidebar"
      aria-label={label}
      className={cn("flex flex-col", className)}
      {...props}
    >
      {label && (
        <span
          data-slot="hook-sidebar-label"
          className="pb-3 pl-0.5 pr-2 font-sans text-sm font-medium uppercase tracking-wide text-slate-950 dark:text-slate-50"
        >
          {label}
        </span>
      )}

      <div
        ref={listRef}
        onMouseLeave={() => setPointerInside(false)}
        className="relative flex flex-col gap-0.5"
      >
        <Rail
          from={hoverFrom}
          y={hoverY}
          visible={(pointerInside || focusInside) && hoverIndex !== activeIndex}
          dashed={dashed}
          className="text-slate-950/30 dark:text-slate-50/30"
        />
        <Rail
          y={activeY}
          visible={activeY !== null}
          color={color}
          dashed={dashed}
        />

        {items.map((item, index) => {
          const text = labelOf(item);
          const href = hrefOf(item);
          const icon = iconOf(item);
          const badge = badgeOf(item);
          const isActive = index === activeIndex;
          const customClass = typeof item === "object" ? item.className : undefined;
          const activeCustomClass = typeof item === "object" ? item.activeClassName : undefined;

          const setRef = (el: HTMLElement | null) => {
            itemRefs.current[index] = el;
          };
          const rowProps = {
            "data-slot": "hook-sidebar-item",
            "data-active": isActive,
            onMouseEnter: () => {
              setHoverIndex(index);
              setPointerInside(true);
            },
            onFocus: () => {
              setHoverIndex(index);
              setFocusInside(true);
            },
            onBlur: () => setFocusInside(false),
            onClick: () => select(index),
            className: cn(
              "flex items-center gap-2.5 rounded-lg py-2 pl-5 pr-3 text-left text-sm transition-colors duration-200 cursor-pointer w-full group",
              isActive
                ? "text-slate-900 font-semibold"
                : "text-slate-500 hover:text-slate-900",
              customClass
            ),
          };

          const innerContent = (
            <>
              {icon && (
                <span className={cn("shrink-0 w-4 h-4 flex items-center justify-center transition-colors relative", isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700")}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={text}
                      initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.7, rotate: 8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="flex items-center justify-center"
                    >
                      {icon}
                    </motion.span>
                  </AnimatePresence>
                </span>
              )}
              <MorphingCharacters text={text} />
              {badge && <span className="shrink-0">{badge}</span>}
            </>
          );

          return href ? (
            <Link
              key={index}
              {...rowProps}
              ref={setRef}
              href={href}
              aria-current={isActive ? "page" : undefined}
            >
              {innerContent}
            </Link>
          ) : (
            <button
              key={index}
              {...rowProps}
              ref={setRef}
              type="button"
              aria-current={isActive ? "true" : undefined}
            >
              {innerContent}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MorphingCharacters({ text }: { text: string }) {
  const letters = Array.from(text);

  return (
    <span className="truncate flex-1 text-xs sm:text-sm relative overflow-hidden inline-flex items-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 5, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -5, filter: "blur(2px)" }}
          transition={{
            duration: 0.18,
            ease: [0.25, 1, 0.5, 1],
          }}
          className="inline-flex items-center whitespace-pre"
        >
          {letters.map((char, i) => (
            <motion.span
              key={`${text}-${char}-${i}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.22,
                delay: i * 0.012,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="inline-block"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
