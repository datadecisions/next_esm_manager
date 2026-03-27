"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEquipmentFinancials } from "@/lib/api/equipment";

function formatCurrency(val) {
  if (val == null || val === "" || isNaN(Number(val))) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(val));
}

function getMonthYearKey(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear();
}

function prepareARChartData(data) {
  const now = new Date();
  const chartBuckets = {};
  let over12MonthsTotal = 0;

  if (data && Array.isArray(data)) {
    data.forEach((item) => {
      const invoiceDate = new Date(item.InvoiceDate);
      const monthsAgo =
        (now.getFullYear() - invoiceDate.getFullYear()) * 12 +
        (now.getMonth() - invoiceDate.getMonth());

      if (monthsAgo < 12) {
        const key = getMonthYearKey(item.InvoiceDate);
        chartBuckets[key] = (chartBuckets[key] || 0) + (item.Balance || 0);
      } else {
        over12MonthsTotal += item.Balance || 0;
      }
    });
  }

  const labels = [];
  const values = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear();
    labels.push(label);
    values.push(chartBuckets[label] || 0);
  }

  labels.push("Over 12 Months");
  values.push(over12MonthsTotal);

  return labels.map((label, i) => ({ label, value: values[i], fill: "var(--chart-1)" }));
}

const INVOICE_FIELD_NAMES = [
  { key: "TotalWithoutTax", label: "Total", color: "var(--chart-1)" },
  { key: "TotalParts", label: "Parts", color: "var(--chart-2)" },
  { key: "TotalLabor", label: "Labor", color: "var(--chart-3)" },
  { key: "TotalMisc", label: "Misc", color: "var(--chart-4)" },
  { key: "TotalEquipment", label: "Equipment", color: "var(--chart-5)" },
  { key: "TotalRental", label: "Rental", color: "var(--chart-2)" },
];

function prepareInvoiceChartData(data) {
  const now = new Date();
  const chartBuckets = {};

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear();
    chartBuckets[label] = {};
    INVOICE_FIELD_NAMES.forEach((field) => {
      chartBuckets[label][field.key] = 0;
    });
  }

  if (data && Array.isArray(data)) {
    data.forEach((item) => {
      if (!item.ClosedDate) return;
      const closedDate = new Date(item.ClosedDate);
      const monthsAgo =
        (now.getFullYear() - closedDate.getFullYear()) * 12 +
        (now.getMonth() - closedDate.getMonth());

      if (monthsAgo < 12) {
        const key = getMonthYearKey(item.ClosedDate);
        if (chartBuckets[key]) {
          INVOICE_FIELD_NAMES.forEach((field) => {
            chartBuckets[key][field.key] += Number(item[field.key]) || 0;
          });
        }
      }
    });
  }

  const labels = Object.keys(chartBuckets);
  return labels.map((label) => {
    const row = { month: label };
    INVOICE_FIELD_NAMES.forEach((field) => {
      row[field.key] = chartBuckets[label][field.key] || 0;
    });
    return row;
  });
}

const AR_CHART_CONFIG = {
  value: { label: "Balance", color: "var(--chart-1)" },
};

const INVOICE_CHART_CONFIG = Object.fromEntries(
  INVOICE_FIELD_NAMES.map((f) => [f.key, { label: f.label, color: f.color }])
);

export default function ChartsTab({ wo, token }) {
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasSerial = wo?.SerialNo && String(wo.SerialNo).trim() !== "";

  useEffect(() => {
    if (!hasSerial || !token) {
      queueMicrotask(() => setFinancials(null));
      return;
    }
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    getEquipmentFinancials(
      {
        serialNo: wo.SerialNo,
        controlNo: wo.ControlNo || " ",
        billTo: wo.BillTo,
      },
      token
    )
      .then(setFinancials)
      .catch((err) => setError(err?.message || "Failed to load charts"))
      .finally(() => setLoading(false));
  }, [wo?.SerialNo, wo?.ControlNo, wo?.BillTo, token, hasSerial]);

  const arData = useMemo(
    () => prepareARChartData(financials?.outstandingBalance),
    [financials?.outstandingBalance]
  );

  const invoiceData = useMemo(
    () => prepareInvoiceChartData(financials?.history),
    [financials?.history]
  );

  const hasARData = arData.some((d) => d.value > 0);
  const hasInvoiceData = invoiceData.some((row) =>
    INVOICE_FIELD_NAMES.some((f) => (row[f.key] || 0) > 0)
  );

  if (!hasSerial) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Charts</h3>
        <p className="text-sm text-muted-foreground">
          Add equipment (Serial No.) to this work order to see AR aging and monthly invoice breakdown charts.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Charts</h3>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Loading charts…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Charts</h3>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="rounded-2xl border border-border">
        <CardHeader>
          <CardTitle className="text-base">Accounts Receivable Aging (Past 12 Months + Over)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Outstanding balance by invoice month for Bill To customer
          </p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={AR_CHART_CONFIG} className="aspect-video min-h-[280px] w-full">
            <BarChart
              accessibilityLayer
              data={arData}
              margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(value)}
                    nameKey="label"
                  />
                }
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
          {!hasARData && (
            <p className="text-sm text-muted-foreground text-center py-4">No outstanding balance</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border">
        <CardHeader>
          <CardTitle className="text-base">Monthly Invoice Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            Closed work orders by month (Total, Parts, Labor, Misc, Equipment, Rental)
          </p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={INVOICE_CHART_CONFIG} className="aspect-video min-h-[280px] w-full">
            <BarChart
              accessibilityLayer
              data={invoiceData}
              margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.month ? String(payload[0].payload.month) : ""
                    }
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {INVOICE_FIELD_NAMES.map((field) => (
                <Bar
                  key={field.key}
                  dataKey={field.key}
                  fill={field.color}
                  radius={4}
                />
              ))}
            </BarChart>
          </ChartContainer>
          {!hasInvoiceData && (
            <p className="text-sm text-muted-foreground text-center py-4">No closed orders in the past 12 months</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
