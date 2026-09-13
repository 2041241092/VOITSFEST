"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Save, Edit2, X, RotateCw } from "lucide-react";
import CFRDatabase from "./CFRDatabase";
import FestivalDatabase from "./FestivalDatabase";
import { formatBIB } from "@/lib/bib";
import { formatDisplayWIB } from "@/lib/timeUtils";

type DataGridProps = {
  tableName: "akun" | "cfr" | "festival" | "bpc" | "bcc" | "seminar" | "tenant";
};

export default function DataGrid({ tableName }: DataGridProps) {
  if (tableName === "cfr") {
    return <CFRDatabase />;
  }
  if (tableName === "festival") {
    return <FestivalDatabase />;
  }

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [columns, setColumns] = useState<string[]>([]);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query;
      
      if (tableName === "akun") {
        query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      } else {
        const realTable = `${tableName}_registrations`;
        query = supabase.from(realTable).select("*").order("created_at", { ascending: false });
      }
      
      const { data: rows, error } = await query;
      
      if (error) {
        console.error(`Error fetching ${tableName} data:`, error);
        setData([]);
      } else if (rows && rows.length > 0) {
        const allKeys = Object.keys(rows[0]);
        const displayCols = allKeys.filter(k => k !== "id" && k !== "created_at" && k !== "member_names");
        setColumns(["id", ...displayCols, "created_at"]);
        setData(rows);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(`Unexpected error in DataGrid (${tableName}):`, err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [tableName, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = (row: any) => {
    setEditingId(row.id);
    setEditFormData({ ...row });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    let targetTable = `${tableName}_registrations`;
    if (tableName === "akun") targetTable = "profiles";

    // Exclude id from update payload
    const { id, ...updateData } = editFormData;
    
    const { error } = await supabase
      .from(targetTable)
      .update(updateData)
      .eq("id", editingId);
      
    if (!error) {
      setEditingId(null);
      fetchData();
    } else {
      alert("Failed to update: " + error.message);
    }
  };

  const filteredData = data.filter(row => {
    if (!search) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <section className="bg-surface-container/30 backdrop-blur-xl border border-white/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
      <div className="p-4 md:p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-surface/50">
        <div>
          <h2 className="text-xl font-bold text-on-surface uppercase tracking-wider">
            {tableName === "akun" ? "Account Database" : `${tableName} Database`}
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Live database view directly synced with Supabase
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RotateCw className={`w-3.5 h-3.5 text-secondary ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search all columns..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-xl text-xs text-on-surface focus:border-secondary outline-none transition-all w-full sm:w-60"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap font-poppins">
          <thead>
            <tr className="bg-surface-container-low/60 text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-white/10">
              {columns.map(col => (
                <th key={col} className="p-3.5 font-semibold">{col.replace(/_/g, " ")}</th>
              ))}
              <th className="p-3.5 font-semibold text-right sticky right-0 bg-surface-container-low/90 backdrop-blur-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-12 text-center text-on-surface-variant">
                  <div className="flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-secondary" />
                    <span>Loading Data from Supabase...</span>
                  </div>
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-12 text-center text-on-surface-variant">
                  <p className="text-sm font-medium">No records found.</p>
                  <p className="text-xs text-on-surface-variant/70 mt-1">This table currently contains no entries in Supabase.</p>
                </td>
              </tr>
            ) : (
              filteredData.map(row => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-surface-variant/30 transition-colors">
                  {columns.map(col => (
                    <td key={col} className="p-3.5 text-on-surface">
                      {editingId === row.id && col !== "id" && col !== "created_at" ? (
                        <input 
                          type="text" 
                          value={editFormData[col] || ""}
                          onChange={e => setEditFormData({...editFormData, [col]: e.target.value})}
                          className="w-full bg-surface-container-highest border border-secondary rounded px-2 py-1 text-white outline-none text-xs"
                        />
                      ) : (
                        <span className="truncate max-w-[220px] block" title={String(row[col] || "")}>
                          {col === "nomor_bib" || col === "bib_number"
                            ? formatBIB(row[col])
                            : col === "created_at" || col === "updated_at" || col === "verified_at" || col === "last_scanned_at"
                            ? formatDisplayWIB(row[col])
                            : String(row[col] || "-")}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="p-3.5 text-right sticky right-0 bg-surface/60 backdrop-blur-sm border-l border-white/5">
                    {editingId === row.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                        <button onClick={handleSaveEdit} className="p-1.5 text-tertiary hover:bg-tertiary/10 transition-colors rounded cursor-pointer">
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleEditClick(row)} className="p-1.5 text-on-surface-variant hover:text-secondary transition-colors rounded cursor-pointer">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
