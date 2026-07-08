import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchableKeys = [],
  emptyMessage = "Nenhum registro encontrado.",
  pageSize = 10,
  rowKey = "id",
  toolbar,
}: {
  data: T[];
  columns: DataTableColumn<T>[];
  searchableKeys?: string[];
  emptyMessage?: string;
  pageSize?: number;
  rowKey?: string;
  toolbar?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const lower = q.toLowerCase();
    return data.filter((row) =>
      searchableKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(lower)),
    );
  }, [data, q, searchableKeys]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {searchableKeys.length > 0 && (
          <Input
            placeholder="Buscar..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
        )}
        <div className="ml-auto flex items-center gap-2">{toolbar}</div>
      </div>
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>{c.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground py-10">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {paged.map((row) => (
              <TableRow key={row[rowKey]}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} registro{total !== 1 ? "s" : ""}</span>
          <div className="flex gap-1">
            <button
              className="px-2 py-1 rounded border disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >Anterior</button>
            <span className="px-2 py-1">{page} / {pages}</span>
            <button
              className="px-2 py-1 rounded border disabled:opacity-50"
              disabled={page === pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >Próximo</button>
          </div>
        </div>
      )}
    </div>
  );
}
