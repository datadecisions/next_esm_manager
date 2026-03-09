"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calculator, Pencil, Paperclip, Wrench, Clock } from "lucide-react";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

const primaryCards = [
  {
    title: "Accounting",
    text: "View accounting summary graphs, AR and AP data.",
    href: "/accounting",
    icon: Calculator,
  },
  {
    title: "Parts",
    text: "View, edit, and approve individual parts and orders.",
    href: "/parts",
    icon: Wrench,
  },
  {
    title: "Purchase Orders",
    text: "Create and maintain purchase orders.",
    href: "/purchase-orders",
    icon: Paperclip,
  },
  {
    title: "Work Orders",
    text: "View, edit, and create individual work orders.",
    href: "/work-orders",
    icon: Pencil,
  },
  {
    title: "Labor",
    text: "Approve labor entries and manage timecards.",
    href: "/labor",
    icon: Clock,
  },
];

function PrimaryCard({ title, text, href, icon: Icon }) {
  return (
    <Link
      href={href}
      className="group flex min-h-[180px] flex-col rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5 active:scale-[0.99] sm:min-h-[220px] dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:border-cyan-500/50"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-50 to-sky-50 transition-colors group-hover:from-cyan-100 group-hover:to-sky-100 dark:from-cyan-900/30 dark:to-sky-900/30 dark:group-hover:from-cyan-800/40 dark:group-hover:to-sky-800/40">
        <Icon className="h-7 w-7 text-slate-600 dark:text-slate-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-white">{title}</h3>
      <p className="mt-2 flex-1 text-slate-500 sm:text-base dark:text-slate-400">{text}</p>
      <span className="mt-4 inline-flex items-center text-sm font-medium text-cyan-600 group-hover:text-cyan-500 dark:text-cyan-400">
        Open
        <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}

export function HomeContent({ userName }) {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-cyan-50/30 dark:from-slate-950 dark:to-slate-900">
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div>
            <h2 className="text-2xl font-light text-slate-600 sm:text-3xl dark:text-slate-400">
              Welcome back,
            </h2>
            <h3 className="mt-1 text-3xl font-semibold text-slate-900 sm:text-4xl dark:text-white">
              {userName}
            </h3>
          </div>
          <div className="w-full max-w-sm">
            <input
              type="search"
              placeholder="Search..."
              className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-slate-700 placeholder-slate-400 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400"
              aria-label="Search"
            />
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {primaryCards.map((card) => (
            <motion.div key={card.title} variants={staggerItem}>
              <PrimaryCard title={card.title} text={card.text} href={card.href} icon={card.icon} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
