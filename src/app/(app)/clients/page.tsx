"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Badge, Button, Card, Empty, Fab, Input, Modal, PageHeader, Select } from "@/components/ui";
import ClientForm, { emptyClient } from "@/components/ClientForm";
import { clientPlans, clientBalance, inr, paidFor, planDecided, statusTone, dueFor, pendingFor } from "@/lib/format";

export default function ClientsPage() {
  const { db, user, isAdmin, update, userName } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [service, setService] = useState("All");
  const [adding, setAdding] = useState(false);

  const list = (isAdmin ? db.clients : db.clients.filter((c) => c.assignedTo === user!.id))
    .filter((c) => {
      const t = q.trim().toLowerCase();
      if (t && !`${c.name} ${c.business} ${c.phone} ${c.city}`.toLowerCase().includes(t)) return false;
      if (status !== "All" && c.status !== status) return false;
      if (service !== "All" && !c.services.includes(service)) return false;
      return true;
    })
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${list.length} clients`}
        actions={
          <Button onClick={() => setAdding(true)} className="max-lg:hidden">
            <Plus size={16} /> New client
          </Button>
        }
      />

      <Card className="mb-4 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_160px_160px] sm:gap-3">
          <div className="relative col-span-2 sm:col-span-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, business, phone or city" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "All", label: "All statuses" }, "Active", "VIP", "Inactive"]} />
          <Select value={service} onChange={(e) => setService(e.target.value)} options={[{ value: "All", label: "All services" }, ...db.settings.services]} />
        </div>
      </Card>

      {list.length === 0 ? (
        <Card><Empty text="No clients found" /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {list.map((c) => {
            const bal = pendingFor(db, c.id);
            return (
              <Link key={c.id} href={`/clients/${c.id}`} className="min-w-0">
                <Card className="h-full p-4 transition hover:shadow-md active:scale-[0.99] active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700">
                        {c.business.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{c.business}</p>
                        <p className="truncate text-sm text-slate-500">{c.name} · {c.city}</p>
                      </div>
                    </div>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {planDecided(c) && clientPlans(c).map((p) => <span key={p.id} className="max-w-full truncate rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{p.name}{p.cycle ? ` · ${p.cycle}` : ""}</span>)}
                    {c.services.map((s) => (
                      <span key={s} className="max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>{userName(c.assignedTo)}</span>
                    {isAdmin && !planDecided(c) && dueFor(db, c.id) > 0 ? (
                      <span className="font-medium text-red-600">Bill due {inr(dueFor(db, c.id))}</span>
                    ) : !planDecided(c) ? (
                      <span className="font-medium text-amber-600">Plan not decided{isAdmin && paidFor(db, c.id) > 0 ? ` · Advance ${inr(paidFor(db, c.id))}` : ""}</span>
                    ) : (
                      isAdmin && (bal > 0 ? <span className="font-medium text-red-600">Due {inr(bal)}</span> : <span className="font-medium text-emerald-600">Fully paid</span>)
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Fab onClick={() => setAdding(true)} label="New client" />

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a new client" wide>
        <ClientForm
          initial={emptyClient(user!.id)}
          onCancel={() => setAdding(false)}
          onSave={(c) => {
            const id = uid("c");
            update((d) => ({ ...d, clients: [...d.clients, { ...c, id }] }));
            setAdding(false);
            router.push(`/clients/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
