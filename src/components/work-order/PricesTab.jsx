"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateWorkOrder } from "@/lib/api/work-order";
import { getLaborRates, getTaxCodes, getAllTaxCodes } from "@/lib/api/admin";

const PARTS_RATE_OPTIONS = [
  { value: "List", label: "List" },
  { value: "Cost", label: "Cost" },
  { value: "Internal", label: "Internal" },
  { value: "Warranty", label: "Warranty" },
  { value: "Wholesale", label: "Wholesale" },
  { value: "Discount", label: "Discount" },
];

const NONE_VALUE = "__none__";

export default function PricesTab({ wo, token, onPricesUpdate }) {
  const [laborRates, setLaborRates] = useState([]);
  const [taxCodes, setTaxCodes] = useState([]);
  const [allTaxCodes, setAllTaxCodes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [laborRate, setLaborRate] = useState(wo?.LaborRate ? String(wo.LaborRate) : NONE_VALUE);
  const [partsRate, setPartsRate] = useState(wo?.PartsRate ?? "List");
  const [partsRateDiscount, setPartsRateDiscount] = useState(wo?.PartsRateDiscount ?? 100);
  const [rentalRate, setRentalRate] = useState(wo?.RentalRate ?? "");
  const [taxCode, setTaxCode] = useState(wo?.TaxCode ? String(wo.TaxCode) : NONE_VALUE);
  const [taxRate, setTaxRate] = useState(wo?.TaxRate ?? "");
  const [taxAccount, setTaxAccount] = useState(wo?.TaxAccount ?? "");
  const [taxable, setTaxable] = useState(wo?.Taxable === -1 || wo?.Taxable === 1);
  const [absoluteTaxCodes, setAbsoluteTaxCodes] = useState(wo?.AbsoluteTaxCodes === -1 || wo?.AbsoluteTaxCodes === 1);
  const [stateTaxCode, setStateTaxCode] = useState(wo?.StateTaxCode ? String(wo.StateTaxCode) : NONE_VALUE);
  const [countyTaxCode, setCountyTaxCode] = useState(wo?.CountyTaxCode ? String(wo.CountyTaxCode) : NONE_VALUE);
  const [cityTaxCode, setCityTaxCode] = useState(wo?.CityTaxCode ? String(wo.CityTaxCode) : NONE_VALUE);
  const [localTaxCode, setLocalTaxCode] = useState(wo?.LocalTaxCode ? String(wo.LocalTaxCode) : NONE_VALUE);

  useEffect(() => {
    if (!wo) return;
    setLaborRate(wo.LaborRate ? String(wo.LaborRate) : NONE_VALUE);
    setPartsRate(wo.PartsRate ?? "List");
    setPartsRateDiscount(wo.PartsRateDiscount ?? 100);
    setRentalRate(wo.RentalRate ?? "");
    setTaxCode(wo.TaxCode ? String(wo.TaxCode) : NONE_VALUE);
    setTaxRate(wo.TaxRate ?? "");
    setTaxAccount(wo.TaxAccount ?? "");
    setTaxable(wo.Taxable === -1 || wo.Taxable === 1);
    setAbsoluteTaxCodes(wo.AbsoluteTaxCodes === -1 || wo.AbsoluteTaxCodes === 1);
    setStateTaxCode(wo.StateTaxCode ? String(wo.StateTaxCode) : NONE_VALUE);
    setCountyTaxCode(wo.CountyTaxCode ? String(wo.CountyTaxCode) : NONE_VALUE);
    setCityTaxCode(wo.CityTaxCode ? String(wo.CityTaxCode) : NONE_VALUE);
    setLocalTaxCode(wo.LocalTaxCode ? String(wo.LocalTaxCode) : NONE_VALUE);
  }, [wo]);

  useEffect(() => {
    if (!token) return;
    Promise.all([getLaborRates(token), getTaxCodes(token), getAllTaxCodes(token)])
      .then(([lr, tc, atc]) => {
        setLaborRates(lr);
        setTaxCodes(tc);
        setAllTaxCodes(atc);
      })
      .catch(() => {});
  }, [token]);

  const handleSave = async (payload) => {
    if (!token || !wo?.WONo || saving) return;
    setSaving(true);
    try {
      await updateWorkOrder({ WONo: wo.WONo, ...payload }, "Update", token);
      onPricesUpdate?.(payload);
      setDirty(false);
      toast.success("Prices updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update prices");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = (e) => {
    e?.preventDefault?.();
    const payload = {
      LaborRate: laborRate === NONE_VALUE ? "" : laborRate,
      PartsRate: partsRate,
      PartsRateDiscount: partsRateDiscount === "" ? null : (parseFloat(partsRateDiscount) ?? 100),
      RentalRate: rentalRate === "" ? null : (parseFloat(rentalRate) ?? 0),
      TaxCode: taxCode === NONE_VALUE ? "" : taxCode,
      TaxRate: taxRate === "" ? null : (parseFloat(taxRate) ?? 0),
      TaxAccount: taxAccount,
      Taxable: taxable ? -1 : 0,
      AbsoluteTaxCodes: absoluteTaxCodes ? -1 : 0,
      StateTaxCode: stateTaxCode === NONE_VALUE ? "" : stateTaxCode,
      CountyTaxCode: countyTaxCode === NONE_VALUE ? "" : countyTaxCode,
      CityTaxCode: cityTaxCode === NONE_VALUE ? "" : cityTaxCode,
      LocalTaxCode: localTaxCode === NONE_VALUE ? "" : localTaxCode,
    };
    handleSave(payload);
  };

  const taxCodesByType = (type) =>
    allTaxCodes.filter((t) => t.type === type && t.Code != null && String(t.Code).trim() !== "");

  const TaxCodeSelect = ({ value, onChange, type, label }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => { onChange(v); setDirty(true); }}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>—</SelectItem>
          {taxCodesByType(type).map((t) => (
            <SelectItem key={`${type}-${t.Code}`} value={String(t.Code)}>
              {t.Code} {t.Rate != null ? `(${t.Rate}%)` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const handleTaxCodeChange = (v) => {
    setTaxCode(v);
    setDirty(true);
    if (v !== NONE_VALUE) {
      const tc = taxCodes.find((t) => String(t.Code) === v);
      if (tc?.Rate != null) setTaxRate(tc.Rate);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Prices</h2>
      </div>
      <form className="p-6" onSubmit={handleUpdate}>
        <div className="grid md:grid-cols-2 gap-8">
          {/* Rates (wo-rates-rates) */}
          <section>
            <h4 className="text-lg font-semibold text-cyan-700 dark:text-cyan-400 mb-4">Rates</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="LaborRate">Labor Rate</Label>
                <Select value={laborRate} onValueChange={(v) => { setLaborRate(v); setDirty(true); }}>
                  <SelectTrigger id="LaborRate" className="w-full">
                    <SelectValue placeholder="Select labor rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>—</SelectItem>
                    {laborRates
                      .filter((lr) => lr.Code != null && String(lr.Code).trim() !== "")
                      .map((lr) => (
                      <SelectItem key={lr.Code} value={String(lr.Code)}>
                        {lr.Code} {lr.Rate != null ? `(${lr.Rate})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="PartsRate">Parts Rate</Label>
                <Select value={partsRate} onValueChange={(v) => { setPartsRate(v); setDirty(true); }}>
                  <SelectTrigger id="PartsRate" className="w-full">
                    <SelectValue placeholder="Select parts rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTS_RATE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="PartsRateDiscount">Parts Rate Discount (%)</Label>
                <Input
                  id="PartsRateDiscount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={partsRateDiscount}
                  onChange={(e) => { setPartsRateDiscount(e.target.value); setDirty(true); }}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="RentalRate">Rental Rate</Label>
                <Input
                  id="RentalRate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={rentalRate}
                  onChange={(e) => { setRentalRate(e.target.value); setDirty(true); }}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* Taxes (wo-rates-taxes) */}
          <section>
            <h4 className="text-lg font-semibold text-cyan-700 dark:text-cyan-400 mb-4">Taxes</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="TaxCode">Tax Code</Label>
                <Select value={taxCode} onValueChange={handleTaxCodeChange}>
                  <SelectTrigger id="TaxCode" className="w-full">
                    <SelectValue placeholder="Select tax code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>—</SelectItem>
                    {taxCodes
                      .filter((t) => t.Code != null && String(t.Code).trim() !== "")
                      .map((t) => (
                        <SelectItem key={t.Code} value={String(t.Code)}>
                          {t.Code} {t.Rate != null ? `(${t.Rate}%)` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="TaxRate">Tax Rate (%)</Label>
                <Input
                  id="TaxRate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={taxRate}
                  onChange={(e) => { setTaxRate(e.target.value); setDirty(true); }}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="TaxAccount">Tax Account</Label>
                <Input
                  id="TaxAccount"
                  type="text"
                  value={taxAccount}
                  onChange={(e) => { setTaxAccount(e.target.value); setDirty(true); }}
                  className="w-full"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="Taxable"
                  checked={taxable}
                  onChange={(e) => { setTaxable(e.target.checked); setDirty(true); }}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <Label htmlFor="Taxable" className="cursor-pointer font-normal">
                  Taxable
                </Label>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-600">
                <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Overrides</h5>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="AbsoluteTaxCodes"
                    checked={absoluteTaxCodes}
                    onChange={(e) => { setAbsoluteTaxCodes(e.target.checked); setDirty(true); }}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <Label htmlFor="AbsoluteTaxCodes" className="cursor-pointer font-normal text-sm">
                    Use absolute tax codes (State + County + City + Local)
                  </Label>
                </div>
                <div className="space-y-3">
                  <TaxCodeSelect value={stateTaxCode} onChange={setStateTaxCode} type="State" label="State Tax Code" />
                  <TaxCodeSelect value={countyTaxCode} onChange={setCountyTaxCode} type="County" label="County Tax Code" />
                  <TaxCodeSelect value={cityTaxCode} onChange={setCityTaxCode} type="City" label="City Code" />
                  <TaxCodeSelect value={localTaxCode} onChange={setLocalTaxCode} type="Local" label="Local Code" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button
            type="submit"
            disabled={!dirty || saving}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {saving ? "Saving…" : "Update"}
          </Button>
        </div>
      </form>
    </div>
  );
}
